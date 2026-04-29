import OverlayCanvas from './OverlayCanvas'
import OverlayEditorToolbar from './OverlayEditorToolbar'
import OverlayLayersPanel from './OverlayLayersPanel'
import OverlayLibrarySidebar from './OverlayLibrarySidebar'
import OverlayPropertiesPanel from './OverlayPropertiesPanel'
import useOverlayEditorState from '../hooks/useOverlayEditorState'
import useOverlayInteractions from '../hooks/useOverlayInteractions'
import useOverlayLibraries from '../hooks/useOverlayLibraries'
import useOverlayEditorActions from '../hooks/useOverlayEditorActions'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fireSwal } from '../utils/swal'

function OverlayEditor({
    overlayId,
    initialOverlay = null,
    onBack,
    onSaved,
    onDirtyChange,
    onRegisterExitGuard
}) {
    const [layerFilter, setLayerFilter] = useState('')
    const state = useOverlayEditorState({ overlayId, initialOverlay, onSaved })
    const libraries = useOverlayLibraries()

    const interactions = useOverlayInteractions({
        overlay: state.overlay,
        setOverlay: state.setOverlay,
        selectedElement: state.selectedElement,
        selectedElementId: state.selectedElementId,
        setSelectedElementId: state.setSelectedElementId,
        activeTool: state.activeTool,
        floatingPanelPos: state.floatingPanelPos,
        zoom: state.zoom,
        setZoom: state.setZoom,
        canvasViewportRef: state.canvasViewportRef,
        canvasWorldRef: state.canvasWorldRef,
        setFloatingPanelPos: state.setFloatingPanelPos,
        panelDragRef: state.panelDragRef,
        history: state.history,
        historyIndex: state.historyIndex,
        undo: state.undo,
        redo: state.redo
    })

    const actions = useOverlayEditorActions({
        overlay: state.overlay,
        setOverlay: state.setOverlay,
        selectedElement: state.selectedElement,
        selectedElementId: state.selectedElementId,
        setSelectedElementId: state.setSelectedElementId,
        activeTool: state.activeTool,
        setActiveTool: state.setActiveTool,
        zoom: state.zoom,
        setZoom: state.setZoom,
        showGrid: state.showGrid,
        setShowGrid: state.setShowGrid,
        canvasViewportRef: state.canvasViewportRef,
        history: state.history,
        historyIndex: state.historyIndex,
        undo: state.undo,
        redo: state.redo
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!state.loading && state.canvasViewportRef?.current) {
                actions.handleFitScreen()
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [state.loading])

    useEffect(() => {
        if (typeof onDirtyChange === 'function') {
            onDirtyChange(state.hasUnsavedChanges)
        }
    }, [state.hasUnsavedChanges, onDirtyChange])

    const hasUnsavedRef = useRef(state.hasUnsavedChanges)
    const handleSaveRef = useRef(state.handleSave)

    useEffect(() => {
        hasUnsavedRef.current = state.hasUnsavedChanges
    }, [state.hasUnsavedChanges])

    useEffect(() => {
        handleSaveRef.current = state.handleSave
    }, [state.handleSave])

    const confirmLeaveEditor = useCallback(async () => {
        if (!hasUnsavedRef.current) return true

        const result = await fireSwal({
            icon: 'warning',
            title: 'Cambios sin guardar',
            text: 'Tienes cambios nuevos en este overlay. ¿Qué quieres hacer?',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Guardar y salir',
            denyButtonText: 'Salir sin guardar',
            cancelButtonText: 'Cancelar'
        })

        if (result.isDenied) return true
        if (!result.isConfirmed) return false

        const saved = await handleSaveRef.current()
        return !!saved
    }, [])

    useEffect(() => {
        if (typeof onRegisterExitGuard !== 'function') return undefined

        // Register guard both via parent callback and a global fallback to avoid
        // race conditions where the parent state isn't updated in time.
        onRegisterExitGuard(confirmLeaveEditor)
        try {
            window.__overlay_request_exit = confirmLeaveEditor
            console.debug('[overlay] registered global exit guard')
        } catch (err) {
            console.debug('[overlay] failed to set global exit guard', err)
        }

        return () => {
            onRegisterExitGuard(null)
            try {
                if (window.__overlay_request_exit === confirmLeaveEditor) delete window.__overlay_request_exit
                console.debug('[overlay] removed global exit guard')
            } catch (err) {
                console.debug('[overlay] failed to remove global exit guard', err)
            }
        }
    }, [confirmLeaveEditor, onRegisterExitGuard])

    // (no-op) debugging and draft persistence removed to keep navigation guard behavior deterministic

    useEffect(() => {
        if (!state.hasUnsavedChanges) return undefined

        const onBeforeUnload = (event) => {
            event.preventDefault()
            event.returnValue = ''
            return ''
        }

        window.addEventListener('beforeunload', onBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [state.hasUnsavedChanges])

    async function handleBackClick() {
        const canLeave = await confirmLeaveEditor()
        if (!canLeave) return
        onBack?.()
    }

    if (state.loading) {
        return (
            <div className="view">
                <div className="card card-full">
                    <div className="hint-text">Cargando editor...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="overlay-editor-page">
            <input
                ref={state.fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={state.handleFilePicked}
            />

            <OverlayEditorToolbar
                activeTool={state.activeTool}
                onAddExternalImage={state.handleAddExternalImageClick}
                onAddRect={state.addRect}
                onAddText={state.addText}
                onBack={handleBackClick}
                onSave={state.handleSave}
                onSetActiveTool={state.setActiveTool}
                onSetCanvasPreset={state.setCanvasPreset}
                onSetOverlayName={(value) => state.updateOverlayField('name', value)}
                onZoomChange={state.setZoom}
                onZoomIn={actions.handleZoomIn}
                onZoomOut={actions.handleZoomOut}
                onFitScreen={actions.handleFitScreen}
                onActualSize={actions.handleActualSize}
                onToggleGrid={actions.handleToggleGrid}
                saving={state.saving}
                showGrid={state.showGrid}
                overlay={state.overlay}
                zoom={state.zoom}
                undo={actions.undo}
                redo={actions.redo}
                selectedElementId={state.selectedElementId}
            />

            {state.message ? <div className="success-box" style={{ marginTop: '0.75rem' }}>{state.message}</div> : null}
            {state.error ? <div className="error-box" style={{ marginTop: '0.75rem' }}>{state.error}</div> : null}

            <div className="overlay-editor-layout">
                <aside className="overlay-left-sidebar">
                    <OverlayLibrarySidebar
                        accentClassName="var(--accent-tt)"
                        filter={libraries.giftFilter}
                        iconClass="fa-brands fa-tiktok"
                        items={libraries.filteredGifts}
                        onFilterChange={libraries.setGiftFilter}
                        onImageError={libraries.markImageBroken}
                        onItemClick={(item) => state.addImageFromUrl(item.__cachedImage || item.__image, item.__name)}
                        placeholder="No hay gifts"
                        title="TikTok Gifts"
                    />

                    <OverlayLibrarySidebar
                        accentClassName="var(--accent-mc)"
                        filter={libraries.renderFilter}
                        iconClass="fa-solid fa-cube"
                        items={libraries.filteredRenders}
                        onFilterChange={libraries.setRenderFilter}
                        onImageError={libraries.markImageBroken}
                        onItemClick={(item) => state.addImageFromUrl(item.__cachedImage || item.__image, item.__name)}
                        placeholder="No hay renders"
                        title="Minecraft"
                    />
                </aside>

                <OverlayCanvas
                    activeTool={state.activeTool}
                    beginDrag={interactions.beginDrag}
                    beginResize={interactions.beginResize}
                    beginRotate={interactions.beginRotate}
                    beginViewportPan={interactions.beginViewportPan}
                    onViewportWheel={interactions.handleViewportWheel}
                    canvasViewportRef={state.canvasViewportRef}
                    canvasWorldRef={state.canvasWorldRef}
                    onBackgroundClick={(id) => state.setSelectedElementId(id)}
                    onCanvasPointerDown={() => state.setSelectedElementId('')}
                    overlay={state.overlay}
                    selectedElement={state.selectedElement}
                    selectedElementId={state.selectedElementId}
                    showGrid={state.showGrid}
                    spacePressed={interactions.spacePressed}
                    viewportPan={interactions.viewportPan}
                    zoom={state.zoom}
                />

                <OverlayLayersPanel
                    filter={layerFilter}
                    layers={state.overlay.elements.filter(el => 
                        !layerFilter || 
                        (el.name || el.text || '').toLowerCase().includes(layerFilter.toLowerCase())
                    )}
                    onDelete={() => state.selectedElementId && state.deleteElement(state.selectedElementId)}
                    onDuplicate={state.duplicateSelected}
                    onFilterChange={setLayerFilter}
                    onMoveDown={() => state.selectedElementId && state.moveLayerDown(state.selectedElementId)}
                    onMoveUp={() => state.selectedElementId && state.moveLayerUp(state.selectedElementId)}
                    onSelect={state.setSelectedElementId}
                    onToggleVisibility={(id) => state.toggleElementVisibility(id)}
                    selectedElementId={state.selectedElementId}
                />
            </div>

            <OverlayPropertiesPanel
                actions={libraries.actions}
                floatingPanelPos={state.floatingPanelPos}
                onClose={() => state.setSelectedElementId('')}
                onDelete={() => state.selectedElementId && state.deleteElement(state.selectedElementId)}
                onDuplicate={state.duplicateSelected}
                onMoveDown={() => state.selectedElementId && state.moveLayerDown(state.selectedElementId)}
                onMoveUp={() => state.selectedElementId && state.moveLayerUp(state.selectedElementId)}
                onStartDrag={interactions.startPropertiesDrag}
                onUpdateField={state.updateSelectedField}
                selectedElement={state.selectedElement}
            />
        </div>
    )
}

export default OverlayEditor