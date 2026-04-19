import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost, apiPut, resolveBackendUrl } from '../api/client'
import {
    createImageElement,
    createRectElement,
    createTextElement,
    isGifUrl,
    normalizeNumber,
    normalizeOverlay,
    reorderByMove,
    uid
} from './overlayEditorUtils'

function useOverlayEditorState({ overlayId, initialOverlay = null, onSaved }) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [overlay, setOverlay] = useState(() => normalizeOverlay(initialOverlay || {}, overlayId))
    const [selectedElementId, setSelectedElementId] = useState('')
    const [activeTool, setActiveTool] = useState('select')
    const [zoom, setZoom] = useState(1)
    const [showGrid, setShowGrid] = useState(true)
    const [layerFilter, setLayerFilter] = useState('')
    const [history, setHistory] = useState([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [floatingPanelPos, setFloatingPanelPos] = useState({ top: 110, right: 280 })

    const canvasViewportRef = useRef(null)
    const canvasWorldRef = useRef(null)
    const panelDragRef = useRef(null)
    const fileInputRef = useRef(null)
    const skipHistoryRef = useRef(false)

    const selectedElement = useMemo(() => {
        return overlay.elements.find((item) => item.id === selectedElementId) || null
    }, [overlay, selectedElementId])

    const visibleLayers = useMemo(() => {
        const term = layerFilter.trim().toLowerCase()
        const sorted = [...overlay.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))

        if (!term) return sorted

        return sorted.filter((item) =>
            `${item.name || ''} ${item.text || ''} ${item.type || ''}`.toLowerCase().includes(term)
        )
    }, [overlay.elements, layerFilter])

    async function loadOverlay() {
        setLoading(true)
        setError('')

        try {
            const data = await apiGet(`/api/overlays/${overlayId}`)
            const normalized = normalizeOverlay(data?.overlay || data, overlayId)
            setOverlay(normalized)
            setSelectedElementId('')
        } catch (err) {
            setError(err.message || 'No se pudo cargar el overlay')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOverlay()
    }, [overlayId])

    useEffect(() => {
        if (skipHistoryRef.current) {
            skipHistoryRef.current = false
            return
        }

        const snapshot = JSON.stringify(overlay)

        setHistory((prev) => {
            const base = prev.slice(0, historyIndex + 1)

            if (base.length > 0 && JSON.stringify(base[base.length - 1]) === snapshot) {
                return prev
            }

            const next = [...base, JSON.parse(snapshot)].slice(-100)

            queueMicrotask(() => {
                setHistoryIndex(next.length - 1)
            })

            return next
        })
    }, [overlay, historyIndex])

    function updateOverlayField(field, value) {
        setOverlay((prev) => ({ ...prev, [field]: value }))
    }

    function updateCanvasField(field, value) {
        setOverlay((prev) => ({
            ...prev,
            canvas: {
                ...prev.canvas,
                [field]: value
            }
        }))
    }

    function setCanvasPreset(value) {
        const [w, h] = String(value).split('x')
        updateCanvasField('width', Number(w || 1080))
        updateCanvasField('height', Number(h || 1920))
    }

    function addElement(element) {
        setOverlay((prev) => ({
            ...prev,
            elements: [
                ...prev.elements,
                {
                    ...element,
                    zIndex: prev.elements.length + 1
                }
            ]
        }))
        setSelectedElementId(element.id)
    }

    function addText() {
        addElement(createTextElement())
    }

    function addRect() {
        addElement(createRectElement())
    }

    function addImageFromUrl(url, name = 'Imagen') {
        const type = isGifUrl(url) ? 'gif' : 'image'
        addElement(createImageElement(url, name, type))
    }

    async function handleAddExternalImageClick() {
        const useFile = window.confirm('Aceptar = subir archivo local. Cancelar = pegar URL externa.')

        if (useFile) {
            fileInputRef.current?.click()
            return
        }

        const url = window.prompt('Pega la URL de la imagen o GIF')
        if (!url) return

        try {
            const cached = await apiPost('/api/cache-image', { url })
            const finalUrl = cached?.cachedUrl ? resolveBackendUrl(cached.cachedUrl) : url
            addImageFromUrl(finalUrl, 'Imagen externa')
        } catch {
            addImageFromUrl(url, 'Imagen externa')
        }
    }

    function handleFilePicked(event) {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
            const result = String(reader.result || '')
            const type = file.type === 'image/gif' || isGifUrl(file.name) ? 'gif' : 'image'
            addElement(createImageElement(result, file.name || 'Imagen subida', type))
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
        reader.readAsDataURL(file)
    }

    function updateElementField(elementId, field, value) {
        setOverlay((prev) => ({
            ...prev,
            elements: prev.elements.map((item) =>
                item.id === elementId
                    ? {
                        ...item,
                        [field]: value
                    }
                    : item
            )
        }))
    }

    function updateSelectedField(field, value) {
        if (!selectedElementId) return
        updateElementField(selectedElementId, field, value)
    }

    function deleteElement(elementId) {
        const ok = window.confirm('¿Eliminar este elemento?')
        if (!ok) return

        setOverlay((prev) => ({
            ...prev,
            elements: prev.elements.filter((item) => item.id !== elementId)
        }))

        setSelectedElementId((prev) => (prev === elementId ? '' : prev))
    }

    function duplicateSelected() {
        if (!selectedElement) return

        const clone = {
            ...selectedElement,
            id: uid('el'),
            name: `${selectedElement.name || 'Elemento'} copia`,
            x: normalizeNumber(selectedElement.x, 0) + 20,
            y: normalizeNumber(selectedElement.y, 0) + 20,
            zIndex: overlay.elements.length + 1
        }

        setOverlay((prev) => ({
            ...prev,
            elements: [...prev.elements, clone]
        }))

        setSelectedElementId(clone.id)
    }

    function moveLayerUp(elementId) {
        const list = [...overlay.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        const index = list.findIndex((item) => item.id === elementId)
        if (index === -1 || index === list.length - 1) return

        const next = reorderByMove(list, index, index + 1).map((item, i) => ({ ...item, zIndex: i + 1 }))
        setOverlay((prev) => ({ ...prev, elements: next }))
    }

    function moveLayerDown(elementId) {
        const list = [...overlay.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        const index = list.findIndex((item) => item.id === elementId)
        if (index <= 0) return

        const next = reorderByMove(list, index, index - 1).map((item, i) => ({ ...item, zIndex: i + 1 }))
        setOverlay((prev) => ({ ...prev, elements: next }))
    }

    function toggleElementVisibility(elementId) {
        setOverlay((prev) => ({
            ...prev,
            elements: prev.elements.map((item) =>
                item.id === elementId ? { ...item, hidden: !item.hidden } : item
            )
        }))
    }

    function undo() {
        if (historyIndex <= 0) return
        const previous = history[historyIndex - 1]
        skipHistoryRef.current = true
        setOverlay(previous)
        setHistoryIndex((prev) => prev - 1)
    }

    function redo() {
        if (historyIndex >= history.length - 1) return
        const next = history[historyIndex + 1]
        skipHistoryRef.current = true
        setOverlay(next)
        setHistoryIndex((prev) => prev + 1)
    }

    async function handleSave() {
        setSaving(true)
        setError('')
        setMessage('')

        try {
            const payload = {
                ...overlay,
                elements: overlay.elements.map((item, index) => ({
                    ...item,
                    zIndex: item.zIndex || index + 1
                }))
            }

            await apiPut(`/api/overlays/${overlayId}`, payload)
            setMessage('Overlay guardado correctamente')
            await loadOverlay()

            if (typeof onSaved === 'function') {
                await onSaved()
            }
        } catch (err) {
            setError(err.message || 'No se pudo guardar el overlay')
        } finally {
            setSaving(false)
        }
    }

    return {
        activeTool,
        addImageFromUrl,
        addRect,
        addText,
        addElement,
        canvasViewportRef,
        canvasWorldRef,
        deleteElement,
        duplicateSelected,
        error,
        fileInputRef,
        floatingPanelPos,
        handleAddExternalImageClick,
        handleFilePicked,
        handleSave,
        history,
        historyIndex,
        layerFilter,
        loading,
        message,
        moveLayerDown,
        moveLayerUp,
        panelDragRef,
        overlay,
        redo,
        reloadOverlay: loadOverlay,
        saving,
        selectedElement,
        selectedElementId,
        setActiveTool,
        setCanvasPreset,
        setFloatingPanelPos,
        setLayerFilter,
        setOverlay,
        setSelectedElementId,
        setShowGrid,
        setZoom,
        showGrid,
        toggleElementVisibility,
        undo,
        updateCanvasField,
        updateElementField,
        updateOverlayField,
        updateSelectedField,
        visibleLayers,
        zoom
    }
}

export default useOverlayEditorState
