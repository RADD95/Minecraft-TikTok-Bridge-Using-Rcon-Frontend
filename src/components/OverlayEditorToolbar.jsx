function OverlayEditorToolbar({
    activeTool,
    onAddExternalImage,
    onAddRect,
    onAddText,
    onBack,
    onSave,
    onSetActiveTool,
    onSetCanvasPreset,
    onSetOverlayName,
    onZoomChange,
    onZoomIn,
    onZoomOut,
    onFitScreen,
    onActualSize,
    onToggleGrid,
    saving,
    showGrid,
    overlay,
    zoom,
    undo,
    redo,
    selectedElementId
}) {
    return (
        <div className="overlay-editor-toolbar">
            {/* Tools Group */}
            <div className="overlay-toolbar-group">
                <button
                    className={`btn btn-secondary ${activeTool === 'select' ? 'active' : ''}`}
                    onClick={() => onSetActiveTool('select')}
                    type="button"
                    title="Move/Select (V)"
                >
                    <i className="fa-solid fa-arrow-pointer"></i>
                </button>

                <button
                    className={`btn btn-secondary ${activeTool === 'zoom' ? 'active' : ''}`}
                    onClick={() => onSetActiveTool('zoom')}
                    type="button"
                    title="Zoom Tool (Z)"
                >
                    <i className="fa-solid fa-magnifying-glass"></i>
                </button>

                <button className="btn btn-secondary" type="button" onClick={onAddRect} title="Rectangle (U)">
                    <i className="fa-regular fa-square"></i>
                </button>

                <button className="btn btn-secondary" type="button" onClick={onAddText} title="Text (T)">
                    <i className="fa-solid fa-font"></i>
                </button>

                <button className="btn btn-secondary" type="button" onClick={onAddExternalImage} title="Image (I)">
                    <i className="fa-regular fa-image"></i>
                </button>
            </div>

            {/* Undo/Redo + Zoom Controls */}
            <div className="overlay-toolbar-group">
                <button className="btn btn-secondary" onClick={undo} type="button" title="Undo (Ctrl+Z)">
                    <i className="fa-solid fa-rotate-left"></i>
                </button>
                <button className="btn btn-secondary" onClick={redo} type="button" title="Redo (Ctrl+Shift+Z)">
                    <i className="fa-solid fa-rotate-right"></i>
                </button>

                <div className="toolbar-separator"></div>

                <button className="btn btn-secondary" onClick={onZoomOut} type="button" title="Zoom Out (-)">
                    <i className="fa-solid fa-minus"></i>
                </button>

                <button className="btn btn-secondary" onClick={onZoomIn} type="button" title="Zoom In (+)">
                    <i className="fa-solid fa-plus"></i>
                </button>

                <button className="btn btn-secondary" onClick={onFitScreen} type="button" title="Fit Screen (0)">
                    <i className="fa-solid fa-expand"></i>
                </button>

                <button className="btn btn-secondary" onClick={onActualSize} type="button" title="100% (1)">
                    <i className="fa-solid fa-eye"></i>
                </button>
            </div>

            {/* Canvas Preset + Zoom Slider */}
            <div className="overlay-toolbar-group overlay-toolbar-center">
                <select
                    className="input-field overlay-preset-select-small"
                    value={`${overlay.canvas.width}x${overlay.canvas.height}`}
                    onChange={(e) => onSetCanvasPreset(e.target.value)}
                >
                    <option value="1080x1920">9:16</option>
                    <option value="1920x1080">16:9</option>
                    <option value="1080x1080">1:1</option>
                </select>

                <div className="overlay-toolbar-meta">
                    <span>{overlay.canvas.width}×{overlay.canvas.height}</span>
                    <span>•</span>
                    <span>{Math.round(zoom * 100)}%</span>
                </div>

                <input
                    type="range"
                    min="25"
                    max="300"
                    value={Math.round(zoom * 100)}
                    onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
                    style={{ width: '120px' }}
                />
            </div>

            {/* Grid + Name */}
            <div className="overlay-toolbar-group">
                <button
                    className={`btn btn-secondary ${showGrid ? 'active' : ''}`}
                    onClick={onToggleGrid}
                    type="button"
                    title="Grid (Ctrl+')"
                >
                    <i className="fa-solid fa-border-all"></i>
                </button>

                <input
                    className="input-field overlay-name-input-small"
                    type="text"
                    placeholder="Sin nombre..."
                    value={overlay.name}
                    onChange={(e) => onSetOverlayName(e.target.value)}
                />
            </div>

            {/* Save & Back */}
            <div className="overlay-toolbar-group">
                <button className="btn btn-primary" onClick={onSave} disabled={saving} type="button">
                    <i className="fa-solid fa-floppy-disk"></i> {saving ? 'Guardando...' : 'Guardar'}
                </button>

                <button className="btn btn-secondary" onClick={onBack} type="button">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
            </div>
        </div>
    )
}

export default OverlayEditorToolbar
