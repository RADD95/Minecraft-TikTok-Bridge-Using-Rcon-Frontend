import { useEffect, useMemo, useRef } from 'react'

const WORKSPACE_PADDING = 900

function OverlayCanvas({
    activeTool,
    beginDrag,
    beginResize,
    beginRotate,
    beginViewportPan,
    onViewportWheel,
    canvasViewportRef,
    canvasWorldRef,
    onBackgroundClick,
    onCanvasPointerDown,
    overlay,
    selectedElement,
    selectedElementId,
    showGrid,
    spacePressed,
    viewportPan,
    zoom
}) {
    const centeredKeyRef = useRef('')
    const workspaceWidth = Math.round(overlay.canvas.width * zoom + WORKSPACE_PADDING * 2)
    const workspaceHeight = Math.round(overlay.canvas.height * zoom + WORKSPACE_PADDING * 2)

    useEffect(() => {
        const viewport = canvasViewportRef.current
        if (!viewport) return

        const key = `${overlay.id || 'overlay'}:${overlay.canvas.width}x${overlay.canvas.height}`
        const shouldRecenterFromOrigin = viewport.scrollLeft === 0 && viewport.scrollTop === 0
        if (centeredKeyRef.current === key && !shouldRecenterFromOrigin) return

        const raf = window.requestAnimationFrame(() => {
            viewport.scrollLeft = Math.max(0, (workspaceWidth - viewport.clientWidth) / 2)
            viewport.scrollTop = Math.max(0, (workspaceHeight - viewport.clientHeight) / 2)
            centeredKeyRef.current = key
        })

        return () => {
            window.cancelAnimationFrame(raf)
        }
    }, [overlay.id, overlay.canvas.width, overlay.canvas.height, workspaceWidth, workspaceHeight, canvasViewportRef])

    useEffect(() => {
        const viewport = canvasViewportRef.current
        if (!viewport) return

        const handleNativeWheel = (event) => {
            onViewportWheel(event)
        }

        viewport.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true })

        return () => {
            viewport.removeEventListener('wheel', handleNativeWheel, true)
        }
    }, [canvasViewportRef, onViewportWheel])

    const selectedLabel = useMemo(() => {
        if (!selectedElementId) return 'Sin selección'
        return `Seleccionado: ${selectedElement?.name || selectedElement?.type || 'Elemento'}`
    }, [selectedElementId, selectedElement])

    function renderCanvasElement(element) {
        const selected = selectedElementId === element.id

        const commonStyle = {
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${Math.max(20, element.width || 20)}px`,
            height: `${Math.max(20, element.height || 20)}px`,
            opacity: Math.max(0, Math.min(1, element.opacity ?? 1)),
            zIndex: element.zIndex || 1,
            transform: `rotate(${Number(element.rotation || 0)}deg)`,
            display: element.hidden ? 'none' : 'block'
        }

        return (
            <div
                key={element.id}
                className={`overlay-dom-node ${selected ? 'selected' : ''}`}
                style={commonStyle}
                onPointerDown={(e) => beginDrag(e, element)}
                onClick={(e) => {
                    e.stopPropagation()
                    onBackgroundClick(element.id)
                }}
            >
                {element.type === 'text' ? (
                    <div
                        className={`overlay-node-text ${element.animation ? `anim-${element.animation}` : ''}`}
                        style={{
                            color: element.color || '#fff',
                            fontSize: `${Math.max(8, Number(element.fontSize || 32))}px`,
                            fontFamily: element.fontFamily || 'Inter, system-ui, sans-serif',
                            fontWeight: Number(element.fontWeight || 700),
                            textAlign: element.textAlign || 'left',
                            background: element.backgroundColor || 'transparent',
                            border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                            animationDuration: `${Number(element.animationDuration || 3)}s`
                        }}
                    >
                        {element.text || 'Texto'}
                    </div>
                ) : element.type === 'rect' ? (
                    <div
                        className={`overlay-node-rect ${element.animation ? `anim-${element.animation}` : ''}`}
                        style={{
                            background: element.backgroundColor || 'transparent',
                            border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                            animationDuration: `${Number(element.animationDuration || 3)}s`
                        }}
                    />
                ) : element.src ? (
                    <img
                        className={`overlay-node-media ${element.animation ? `anim-${element.animation}` : ''}`}
                        src={element.src || undefined}
                        alt={element.name || 'media'}
                        draggable={false}
                        style={{
                            objectFit: element.fit || 'contain',
                            border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                            background: element.backgroundColor || 'transparent',
                            animationDuration: `${Number(element.animationDuration || 3)}s`
                        }}
                    />
                ) : (
                    <div
                        className={`overlay-node-media ${element.animation ? `anim-${element.animation}` : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                            background: element.backgroundColor || 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.55)',
                            animationDuration: `${Number(element.animationDuration || 3)}s`,
                            fontSize: '12px',
                            textAlign: 'center',
                            padding: '8px'
                        }}
                    >
                        Sin imagen
                    </div>
                )}

                {selected ? (
                    <>
                        <div className="resize-handle resize-nw" onPointerDown={(e) => beginResize(e, element, 'nw')} />
                        <div className="resize-handle resize-n" onPointerDown={(e) => beginResize(e, element, 'n')} />
                        <div className="resize-handle resize-ne" onPointerDown={(e) => beginResize(e, element, 'ne')} />
                        <div className="resize-handle resize-e" onPointerDown={(e) => beginResize(e, element, 'e')} />
                        <div className="resize-handle resize-se" onPointerDown={(e) => beginResize(e, element, 'se')} />
                        <div className="resize-handle resize-s" onPointerDown={(e) => beginResize(e, element, 's')} />
                        <div className="resize-handle resize-sw" onPointerDown={(e) => beginResize(e, element, 'sw')} />
                        <div className="resize-handle resize-w" onPointerDown={(e) => beginResize(e, element, 'w')} />

                        <div className="rotate-handle-line" />
                        <div className="rotate-handle" onPointerDown={(e) => beginRotate(e, element)} />
                    </>
                ) : null}
            </div>
        )
    }

    return (
        <div className="overlay-canvas-stage">
            <div className="overlay-canvas-topmeta">
                <span>Canvas DOM editable</span>
                <span>•</span>
                <span>{selectedLabel}</span>
            </div>

            <div
                ref={canvasViewportRef}
                className={`overlay-canvas-viewport ${showGrid ? 'grid-on' : ''} ${(activeTool === 'hand' || spacePressed) ? 'hand-mode' : ''} ${viewportPan ? 'dragging' : ''}`}
                onClick={onCanvasPointerDown}
                onPointerDown={beginViewportPan}
            >
                <div
                    className="overlay-canvas-workspace"
                    style={{
                        width: `${workspaceWidth}px`,
                        height: `${workspaceHeight}px`
                    }}
                >
                    <div
                    ref={canvasWorldRef}
                    className="overlay-canvas-world"
                    style={{
                        width: `${overlay.canvas.width}px`,
                        height: `${overlay.canvas.height}px`,
                        transform: `translate(${WORKSPACE_PADDING}px, ${WORKSPACE_PADDING}px) scale(${zoom})`,
                        transformOrigin: 'top left',
                        background:
                            overlay.canvas.background && overlay.canvas.background !== '#ffffff03'
                                ? overlay.canvas.background
                                : '#ffffff03',
                        overflow: 'visible'
                    }}
                >
                    {overlay.elements
                        .slice()
                        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                        .map(renderCanvasElement)}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OverlayCanvas
