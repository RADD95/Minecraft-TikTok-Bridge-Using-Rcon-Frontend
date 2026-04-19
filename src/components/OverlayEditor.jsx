import OverlayCanvas from './OverlayCanvas'
import OverlayEditorToolbar from './OverlayEditorToolbar'
import OverlayLayersPanel from './OverlayLayersPanel'
import OverlayLibrarySidebar from './OverlayLibrarySidebar'
import OverlayPropertiesPanel from './OverlayPropertiesPanel'
import useOverlayEditorState from '../hooks/useOverlayEditorState'
import useOverlayInteractions from '../hooks/useOverlayInteractions'
import useOverlayLibraries from '../hooks/useOverlayLibraries'
import useOverlayEditorActions from '../hooks/useOverlayEditorActions'
import { useEffect, useState } from 'react'

function OverlayEditor({ overlayId, initialOverlay = null, onBack, onSaved }) {
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
                onBack={onBack}
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