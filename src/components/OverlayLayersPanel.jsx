function OverlayLayersPanel({
    filter,
    onDelete,
    onDuplicate,
    onFilterChange,
    onMoveDown,
    onMoveUp,
    onSelect,
    onToggleVisibility,
    selectedElementId,
    layers
}) {
    return (
        <aside className="overlay-right-sidebar">
            <div className="overlay-panel-header">
                <div className="overlay-panel-title">
                    <i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-gold)' }}></i>
                    <span>Capas</span>
                </div>

                <input
                    className="input-field overlay-mini-search"
                    type="text"
                    placeholder="Filtrar capas..."
                    value={filter}
                    onChange={(e) => onFilterChange(e.target.value)}
                />
            </div>

            <div className="overlay-layer-toolbar">
                <button className="btn-icon" onClick={onDuplicate} type="button" title="Duplicar">
                    <i className="fa-solid fa-copy"></i>
                </button>

                <button className="btn-icon" onClick={onMoveUp} type="button" title="Subir capa">
                    <i className="fa-solid fa-arrow-up"></i>
                </button>

                <button className="btn-icon" onClick={onMoveDown} type="button" title="Bajar capa">
                    <i className="fa-solid fa-arrow-down"></i>
                </button>

                <div style={{ flex: 1 }}></div>

                <button className="btn-icon delete" onClick={onDelete} type="button" title="Eliminar">
                    <i className="fa-solid fa-trash"></i>
                </button>
            </div>

            <div className="overlay-layers-tree">
                {layers.length === 0 ? (
                    <p className="hint-text" style={{ padding: '1rem', textAlign: 'center' }}>
                        No hay capas
                    </p>
                ) : (
                    layers.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`overlay-layer-row ${selectedElementId === item.id ? 'selected' : ''}`}
                            onClick={() => onSelect(item.id)}
                        >
                            <span className="overlay-layer-row-left">
                                <i
                                    className={`fa-solid ${item.type === 'text'
                                        ? 'fa-font'
                                        : item.type === 'rect'
                                            ? 'fa-square'
                                            : 'fa-image'
                                        }`}
                                ></i>
                                <span className="overlay-layer-name">{item.name || item.text || `${item.type} ${index + 1}`}</span>
                            </span>

                            <span
                                className="overlay-layer-visibility"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleVisibility(item.id)
                                }}
                            >
                                <i className={`fa-solid ${item.hidden ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </span>
                        </button>
                    ))
                )}
            </div>
        </aside>
    )
}

export default OverlayLayersPanel
