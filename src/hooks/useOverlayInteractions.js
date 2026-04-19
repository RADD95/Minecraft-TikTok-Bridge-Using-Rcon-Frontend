import { useEffect, useRef, useState } from 'react'
import { clamp, normalizeNumber, uid } from './overlayEditorUtils'

function useOverlayInteractions({
    overlay,
    setOverlay,
    selectedElement,
    selectedElementId,
    setSelectedElementId,
    activeTool,
    floatingPanelPos,
    zoom,
    setZoom,
    canvasViewportRef,
    canvasWorldRef,
    setFloatingPanelPos,
    panelDragRef,
    history,
    historyIndex,
    undo,
    redo
}) {
    const [spacePressed, setSpacePressed] = useState(false)
    const [dragState, setDragState] = useState(null)
    const [resizeState, setResizeState] = useState(null)
    const [rotateState, setRotateState] = useState(null)
    const [viewportPan, setViewportPan] = useState(null)
    const rafIdRef = useRef(0)
    const pendingPointerRef = useRef(null)

    function getPointerCanvasPointFromClient(clientX, clientY) {
        const world = canvasWorldRef?.current
        if (world) {
            const rect = world.getBoundingClientRect()
            return {
                x: (clientX - rect.left) / zoom,
                y: (clientY - rect.top) / zoom
            }
        }

        const viewport = canvasViewportRef.current
        if (!viewport) return { x: 0, y: 0 }

        const rect = viewport.getBoundingClientRect()

        return {
            x: (clientX - rect.left + viewport.scrollLeft) / zoom,
            y: (clientY - rect.top + viewport.scrollTop) / zoom
        }
    }

    function getPointerCanvasPoint(event) {
        return getPointerCanvasPointFromClient(event.clientX, event.clientY)
    }

    function beginDrag(event, element) {
        if (activeTool === 'hand' || spacePressed) return
        if (event.button !== 0) return

        event.preventDefault()
        event.stopPropagation()

        const point = getPointerCanvasPoint(event)

        setSelectedElementId(element.id)
        setDragState({
            id: element.id,
            startX: point.x,
            startY: point.y,
            elementX: normalizeNumber(element.x, 0),
            elementY: normalizeNumber(element.y, 0)
        })
    }

    function beginResize(event, element, handle) {
        event.preventDefault()
        event.stopPropagation()

        const point = getPointerCanvasPoint(event)

        setSelectedElementId(element.id)
        setResizeState({
            id: element.id,
            handle,
            startX: point.x,
            startY: point.y,
            startWidth: normalizeNumber(element.width, 100),
            startHeight: normalizeNumber(element.height, 100),
            startLeft: normalizeNumber(element.x, 0),
            startTop: normalizeNumber(element.y, 0)
        })
    }

    function beginViewportPan(event) {
        // Middle mouse button (button 1) for pan, or hand tool, or space pressed
        if (event.button === 1 || activeTool === 'hand' || spacePressed) {
            if (!canvasViewportRef.current) return

            event.preventDefault()

            setViewportPan({
                startX: event.clientX,
                startY: event.clientY,
                scrollLeft: canvasViewportRef.current.scrollLeft,
                scrollTop: canvasViewportRef.current.scrollTop
            })
        }
    }

    function beginRotate(event, element) {
        event.preventDefault()
        event.stopPropagation()

        const point = getPointerCanvasPoint(event)
        const width = Math.max(20, normalizeNumber(element.width, 20))
        const height = Math.max(20, normalizeNumber(element.height, 20))
        const centerX = normalizeNumber(element.x, 0) + width / 2
        const centerY = normalizeNumber(element.y, 0) + height / 2
        const startPointerAngle = Math.atan2(point.y - centerY, point.x - centerX) * (180 / Math.PI)

        setSelectedElementId(element.id)
        setRotateState({
            id: element.id,
            centerX,
            centerY,
            startRotation: normalizeNumber(element.rotation, 0),
            startPointerAngle
        })
    }

    function handleViewportWheel(event) {
        const nativeEvent = event?.nativeEvent ?? event
        const viewport = canvasViewportRef?.current
        const world = canvasWorldRef?.current
        if (!viewport || !world) return

        if (nativeEvent?.stopImmediatePropagation) {
            nativeEvent.stopImmediatePropagation()
        }

        if (nativeEvent?.cancelable) {
            nativeEvent.preventDefault()
        }
        if (event?.preventDefault) {
            event.preventDefault()
        }
        if (event?.stopPropagation) {
            event.stopPropagation()
        }

        if (!nativeEvent?.altKey) return

        // Scroll up (deltaY < 0) = zoom in; scroll down (deltaY > 0) = zoom out
        const step = nativeEvent.deltaY < 0 ? 0.01 : -0.01
        const nextZoom = clamp(Number((zoom + step).toFixed(2)), 0.25, 3)
        if (nextZoom === zoom) return

        const beforeRect = world.getBoundingClientRect()
        const cursorCanvasX = (nativeEvent.clientX - beforeRect.left) / zoom
        const cursorCanvasY = (nativeEvent.clientY - beforeRect.top) / zoom

        setZoom(nextZoom)

        window.requestAnimationFrame(() => {
            const afterRect = world.getBoundingClientRect()
            const pointClientX = afterRect.left + cursorCanvasX * nextZoom
            const pointClientY = afterRect.top + cursorCanvasY * nextZoom
            const deltaX = pointClientX - nativeEvent.clientX
            const deltaY = pointClientY - nativeEvent.clientY

            viewport.scrollLeft += deltaX
            viewport.scrollTop += deltaY
        })
    }

    function startPropertiesDrag(event) {
        event.preventDefault()

        if (!panelDragRef?.current && panelDragRef) {
            panelDragRef.current = null
        }

        if (!panelDragRef) return

        panelDragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            top: floatingPanelPos.top,
            right: floatingPanelPos.right
        }
    }

    useEffect(() => {
        function applyPointerTransform(clientX, clientY) {
            const point = getPointerCanvasPointFromClient(clientX, clientY)

            if (dragState) {
                const dx = point.x - dragState.startX
                const dy = point.y - dragState.startY

                setOverlay((prev) => ({
                    ...prev,
                    elements: prev.elements.map((item) =>
                        item.id === dragState.id
                            ? {
                                ...item,
                                x: Math.round(dragState.elementX + dx),
                                y: Math.round(dragState.elementY + dy)
                            }
                            : item
                    )
                }))
            }

            if (resizeState) {
                const dx = point.x - resizeState.startX
                const dy = point.y - resizeState.startY

                let width = resizeState.startWidth
                let height = resizeState.startHeight
                let left = resizeState.startLeft
                let top = resizeState.startTop

                if (resizeState.handle.includes('e')) {
                    width = clamp(resizeState.startWidth + dx, 20, 5000)
                }
                if (resizeState.handle.includes('s')) {
                    height = clamp(resizeState.startHeight + dy, 20, 5000)
                }
                if (resizeState.handle.includes('w')) {
                    width = clamp(resizeState.startWidth - dx, 20, 5000)
                    left = resizeState.startLeft + dx
                }
                if (resizeState.handle.includes('n')) {
                    height = clamp(resizeState.startHeight - dy, 20, 5000)
                    top = resizeState.startTop + dy
                }

                setOverlay((prev) => ({
                    ...prev,
                    elements: prev.elements.map((item) =>
                        item.id === resizeState.id
                            ? {
                                ...item,
                                x: Math.round(left),
                                y: Math.round(top),
                                width: Math.round(width),
                                height: Math.round(height)
                            }
                            : item
                    )
                }))
            }

            if (rotateState) {
                const currentAngle = Math.atan2(
                    point.y - rotateState.centerY,
                    point.x - rotateState.centerX
                ) * (180 / Math.PI)

                const nextRotation = Math.round(
                    rotateState.startRotation + (currentAngle - rotateState.startPointerAngle)
                )

                setOverlay((prev) => ({
                    ...prev,
                    elements: prev.elements.map((item) =>
                        item.id === rotateState.id
                            ? {
                                ...item,
                                rotation: nextRotation
                            }
                            : item
                    )
                }))
            }
        }

        function schedulePointerTransform(clientX, clientY) {
            pendingPointerRef.current = { clientX, clientY }

            if (rafIdRef.current) return

            rafIdRef.current = window.requestAnimationFrame(() => {
                rafIdRef.current = 0
                const pending = pendingPointerRef.current
                if (!pending) return

                applyPointerTransform(pending.clientX, pending.clientY)
            })
        }

        function onMove(event) {
            if (dragState || resizeState || rotateState) {
                schedulePointerTransform(event.clientX, event.clientY)
            }

            if (viewportPan && canvasViewportRef.current) {
                const dx = event.clientX - viewportPan.startX
                const dy = event.clientY - viewportPan.startY

                canvasViewportRef.current.scrollLeft = viewportPan.scrollLeft - dx
                canvasViewportRef.current.scrollTop = viewportPan.scrollTop - dy
            }

            if (panelDragRef?.current) {
                const dx = event.clientX - panelDragRef.current.startX
                const dy = event.clientY - panelDragRef.current.startY

                setFloatingPanelPos({
                    top: panelDragRef.current.top + dy,
                    right: panelDragRef.current.right - dx
                })
            }
        }

        function onUp() {
            setDragState(null)
            setResizeState(null)
            setRotateState(null)
            setViewportPan(null)
            pendingPointerRef.current = null
            if (rafIdRef.current) {
                window.cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = 0
            }
            if (panelDragRef) {
                panelDragRef.current = null
            }
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)

        return () => {
            if (rafIdRef.current) {
                window.cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = 0
            }
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }
    }, [dragState, resizeState, rotateState, viewportPan, zoom, canvasWorldRef, setOverlay, panelDragRef, setFloatingPanelPos])

    useEffect(() => {
        function onKeyDown(event) {
            const key = event.key.toLowerCase()
            const mod = event.ctrlKey || event.metaKey

            if (key === ' ') {
                event.preventDefault()
                setSpacePressed(true)
                return
            }

            if (key === 'delete') {
                event.preventDefault()
                if (!selectedElementId) return
                setOverlay((prev) => ({
                    ...prev,
                    elements: prev.elements.filter((el) => el.id !== selectedElementId)
                }))
                setSelectedElementId('')
                return
            }

            if (mod && key === 'x') {
                event.preventDefault()
                if (!selectedElement) return
                window.__overlayClipboard = JSON.stringify(selectedElement)
                setOverlay((prev) => ({
                    ...prev,
                    elements: prev.elements.filter((el) => el.id !== selectedElementId)
                }))
                setSelectedElementId('')
                return
            }

            if (mod && key === 'c') {
                event.preventDefault()
                if (!selectedElement) return
                window.__overlayClipboard = JSON.stringify(selectedElement)
                return
            }

            if (mod && key === 'v') {
                event.preventDefault()
                if (!window.__overlayClipboard) return

                try {
                    const parsed = JSON.parse(window.__overlayClipboard)
                    const clone = {
                        ...parsed,
                        id: uid('el'),
                        name: `${parsed.name || 'Elemento'} copia`,
                        x: normalizeNumber(parsed.x, 0) + 30,
                        y: normalizeNumber(parsed.y, 0) + 30,
                        zIndex: overlay.elements.length + 1
                    }

                    setOverlay((prev) => ({
                        ...prev,
                        elements: [...prev.elements, clone]
                    }))
                    setSelectedElementId(clone.id)
                } catch {
                    return
                }

                return
            }

            if (mod && key === 'z' && !event.shiftKey) {
                event.preventDefault()
                undo()
                return
            }

            if ((mod && key === 'y') || (mod && event.shiftKey && key === 'z')) {
                event.preventDefault()
                redo()
            }
        }

        function onKeyUp(event) {
            if (event.key === ' ') {
                setSpacePressed(false)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
        }
    }, [overlay, redo, selectedElement, setOverlay, setSelectedElementId, undo])

    return {
        beginDrag,
        beginResize,
        beginRotate,
        beginViewportPan,
        handleViewportWheel,
        viewportPan,
        spacePressed,
        startPropertiesDrag
    }
}

export default useOverlayInteractions
