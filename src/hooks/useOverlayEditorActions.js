import { useCallback } from 'react'
import { uid, clamp } from './overlayEditorUtils'

const WORKSPACE_PADDING = 900

function useOverlayEditorActions({
  overlay,
  setOverlay,
  selectedElementId,
  selectedElement,
  setSelectedElementId,
  zoom,
  setZoom,
  activeTool,
  setActiveTool,
  showGrid,
  setShowGrid,
  canvasViewportRef,
  history,
  historyIndex,
  undo,
  redo
}) {
  // Zoom actions
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => clamp(Number((prev + 0.1).toFixed(2)), 0.25, 3))
  }, [setZoom])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => clamp(Number((prev - 0.1).toFixed(2)), 0.25, 3))
  }, [setZoom])

  const handleFitScreen = useCallback(() => {
    if (!canvasViewportRef?.current) return
    const viewport = canvasViewportRef.current
    const canvasWidth = overlay.canvas.width
    const canvasHeight = overlay.canvas.height
    
    const viewportWidth = viewport.clientWidth
    const viewportHeight = viewport.clientHeight
    
    const scale = Math.min(
      (viewportWidth - 40) / canvasWidth,
      (viewportHeight - 40) / canvasHeight,
      1
    )

    const nextZoom = clamp(Number(scale.toFixed(2)), 0.25, 3)
    setZoom(nextZoom)

    // Recenter viewport after zoom is applied so initial load does not land off-canvas.
    window.requestAnimationFrame(() => {
      const workspaceWidth = Math.round(canvasWidth * nextZoom + WORKSPACE_PADDING * 2)
      const workspaceHeight = Math.round(canvasHeight * nextZoom + WORKSPACE_PADDING * 2)
      viewport.scrollLeft = Math.max(0, (workspaceWidth - viewport.clientWidth) / 2)
      viewport.scrollTop = Math.max(0, (workspaceHeight - viewport.clientHeight) / 2)
    })
  }, [overlay.canvas.width, overlay.canvas.height, setZoom, canvasViewportRef])

  const handleActualSize = useCallback(() => {
    setZoom(1)
  }, [setZoom])

  // Tool actions
  const handleSetActiveTool = useCallback((toolId) => {
    setActiveTool(toolId)
  }, [setActiveTool])

  // Grid toggle
  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev)
  }, [setShowGrid])

  // Layer actions
  const handleNewLayer = useCallback(() => {
    const newElement = {
      id: uid('el'),
      type: 'rect',
      name: `Layer ${overlay.elements.length + 1}`,
      x: 80,
      y: 80,
      width: 220,
      height: 140,
      rotation: 0,
      opacity: 1,
      zIndex: overlay.elements.length + 1,
      backgroundColor: 'rgba(0,0,0,0)',
      borderColor: 'rgba(255,255,255,0.9)',
      borderWidth: 1,
      animation: '',
      animationDuration: 3,
      trigger: '',
      hidden: false
    }
    
    setOverlay((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
    setSelectedElementId(newElement.id)
  }, [overlay.elements.length, setOverlay, setSelectedElementId])

  const handleDuplicateLayer = useCallback(() => {
    if (!selectedElement) return
    
    const duplicate = {
      ...selectedElement,
      id: uid('el'),
      name: `${selectedElement.name} copia`,
      x: (selectedElement.x || 0) + 20,
      y: (selectedElement.y || 0) + 20,
      zIndex: overlay.elements.length + 1
    }
    
    setOverlay((prev) => ({
      ...prev,
      elements: [...prev.elements, duplicate]
    }))
    setSelectedElementId(duplicate.id)
  }, [selectedElement, overlay.elements.length, setOverlay, setSelectedElementId])

  const handleDeleteLayer = useCallback(() => {
    if (!selectedElementId) return
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== selectedElementId)
    }))
    setSelectedElementId('')
  }, [selectedElementId, setOverlay, setSelectedElementId])

  const handleToggleVisibility = useCallback(() => {
    if (!selectedElementId) return
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, hidden: !el.hidden }
          : el
      )
    }))
  }, [selectedElementId, setOverlay])

  const handleLockLayer = useCallback(() => {
    // Lock/unlock toggle would need additional state in element
    // For now, just log
    console.log('Lock layer:', selectedElementId)
  }, [selectedElementId])

  // Order actions
  const handleBringToFront = useCallback(() => {
    if (!selectedElementId) return
    
    setOverlay((prev) => {
      const maxZIndex = Math.max(...prev.elements.map((e) => e.zIndex || 0), 0)
      return {
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === selectedElementId
            ? { ...el, zIndex: maxZIndex + 1 }
            : el
        )
      }
    })
  }, [selectedElementId, setOverlay])

  const handleSendToBack = useCallback(() => {
    if (!selectedElementId) return
    
    setOverlay((prev) => {
      const minZIndex = Math.min(...prev.elements.map((e) => e.zIndex || 0), 0)
      return {
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === selectedElementId
            ? { ...el, zIndex: minZIndex - 1 }
            : el
        )
      }
    })
  }, [selectedElementId, setOverlay])

  // Alignment actions
  const handleAlignLeft = useCallback(() => {
    if (!selectedElement) return
    const minX = Math.min(...overlay.elements.map((e) => e.x || 0))
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, x: minX }
          : el
      )
    }))
  }, [selectedElement, selectedElementId, overlay, setOverlay])

  const handleAlignCenterH = useCallback(() => {
    if (!selectedElement) return
    const canvasWidth = overlay.canvas.width
    const elementWidth = selectedElement.width || 100
    const centerX = (canvasWidth - elementWidth) / 2
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, x: Math.round(centerX) }
          : el
      )
    }))
  }, [selectedElement, selectedElementId, overlay, setOverlay])

  const handleAlignRight = useCallback(() => {
    if (!selectedElement) return
    const maxX = Math.max(...overlay.elements.map((e) => (e.x || 0) + (e.width || 100)))
    const rightX = maxX - (selectedElement.width || 100)
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, x: rightX }
          : el
      )
    }))
  }, [selectedElement, selectedElementId, overlay, setOverlay])

  const handleAlignTop = useCallback(() => {
    if (!selectedElement) return
    const minY = Math.min(...overlay.elements.map((e) => e.y || 0))
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, y: minY }
          : el
      )
    }))
  }, [selectedElement, selectedElementId, overlay, setOverlay])

  const handleAlignCenterV = useCallback(() => {
    if (!selectedElement) return
    const canvasHeight = overlay.canvas.height
    const elementHeight = selectedElement.height || 100
    const centerY = (canvasHeight - elementHeight) / 2
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, y: Math.round(centerY) }
          : el
      )
    }))
  }, [selectedElement, selectedElementId, overlay, setOverlay])

  const handleAlignBottom = useCallback(() => {
    if (!selectedElement) return
    const maxY = Math.max(...overlay.elements.map((e) => (e.y || 0) + (e.height || 100)))
    const bottomY = maxY - (selectedElement.height || 100)
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, y: bottomY }
          : el
      )
    }))
  }, [selectedElement, selectedElementId, overlay, setOverlay])

  // Flip actions
  const handleFlipH = useCallback(() => {
    if (!selectedElement) return
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, scaleX: (el.scaleX || 1) * -1 }
          : el
      )
    }))
  }, [selectedElementId, setOverlay])

  const handleFlipV = useCallback(() => {
    if (!selectedElement) return
    
    setOverlay((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId
          ? { ...el, scaleY: (el.scaleY || 1) * -1 }
          : el
      )
    }))
  }, [selectedElementId, setOverlay])

  return {
    // Zoom
    handleZoomIn,
    handleZoomOut,
    handleFitScreen,
    handleActualSize,
    // Tools
    handleSetActiveTool,
    // Grid
    handleToggleGrid,
    // Layers
    handleNewLayer,
    handleDuplicateLayer,
    handleDeleteLayer,
    handleToggleVisibility,
    handleLockLayer,
    // Order
    handleBringToFront,
    handleSendToBack,
    // Alignment
    handleAlignLeft,
    handleAlignCenterH,
    handleAlignRight,
    handleAlignTop,
    handleAlignCenterV,
    handleAlignBottom,
    // Flip
    handleFlipH,
    handleFlipV,
    // Existing
    undo,
    redo
  }
}

export default useOverlayEditorActions
