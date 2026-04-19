function OverlayPropertiesPanel({
    actions,
    floatingPanelPos,
    onClose,
    onDelete,
    onDuplicate,
    onMoveDown,
    onMoveUp,
    onStartDrag,
    onUpdateField,
    selectedElement
}) {
    if (!selectedElement) return null

    return (
        <div
            className="overlay-floating-properties"
            style={{
                top: `${floatingPanelPos.top}px`,
                right: `${floatingPanelPos.right}px`
            }}
        >
            <div className="overlay-floating-header" onPointerDown={onStartDrag}>
                <span>Propiedades</span>
                <button className="btn-icon" type="button" onClick={onClose}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div className="overlay-floating-body">
                <div className="overlay-prop-grid">
                    <div>
                        <label className="input-label">Nombre</label>
                        <input
                            className="input-field"
                            type="text"
                            value={selectedElement.name || ''}
                            onChange={(e) => onUpdateField('name', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="input-label">X</label>
                        <input
                            className="input-field"
                            type="number"
                            value={selectedElement.x || 0}
                            onChange={(e) => onUpdateField('x', Number(e.target.value || 0))}
                        />
                    </div>

                    <div>
                        <label className="input-label">Y</label>
                        <input
                            className="input-field"
                            type="number"
                            value={selectedElement.y || 0}
                            onChange={(e) => onUpdateField('y', Number(e.target.value || 0))}
                        />
                    </div>

                    <div>
                        <label className="input-label">W</label>
                        <input
                            className="input-field"
                            type="number"
                            min="20"
                            value={selectedElement.width || 0}
                            onChange={(e) => onUpdateField('width', Number(e.target.value || 20))}
                        />
                    </div>

                    <div>
                        <label className="input-label">H</label>
                        <input
                            className="input-field"
                            type="number"
                            min="20"
                            value={selectedElement.height || 0}
                            onChange={(e) => onUpdateField('height', Number(e.target.value || 20))}
                        />
                    </div>

                    <div>
                        <label className="input-label">Rotación</label>
                        <input
                            className="input-field"
                            type="number"
                            value={selectedElement.rotation || 0}
                            onChange={(e) => onUpdateField('rotation', Number(e.target.value || 0))}
                        />
                    </div>

                    <div>
                        <label className="input-label">Opacidad</label>
                        <input
                            className="input-field"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedElement.opacity ?? 1}
                            onChange={(e) => onUpdateField('opacity', Number(e.target.value || 1))}
                        />
                    </div>

                    <div>
                        <label className="input-label">Borde</label>
                        <input
                            className="input-field"
                            type="color"
                            value={
                                String(selectedElement.borderColor || '').startsWith('#')
                                    ? selectedElement.borderColor
                                    : '#ffffff'
                            }
                            onChange={(e) => onUpdateField('borderColor', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="input-label">Ancho borde</label>
                        <input
                            className="input-field"
                            type="number"
                            min="0"
                            max="30"
                            value={selectedElement.borderWidth || 0}
                            onChange={(e) => onUpdateField('borderWidth', Number(e.target.value || 0))}
                        />
                    </div>

                    {(selectedElement.type === 'rect' || selectedElement.type === 'text') ? (
                        <div>
                            <label className="input-label">Fondo</label>
                            <input
                                className="input-field"
                                type="color"
                                value={
                                    String(selectedElement.backgroundColor || '').startsWith('#')
                                        ? selectedElement.backgroundColor
                                        : '#000000'
                                }
                                onChange={(e) => onUpdateField('backgroundColor', e.target.value)}
                            />
                        </div>
                    ) : null}

                    {selectedElement.type === 'text' ? (
                        <>
                            <div className="overlay-prop-full">
                                <label className="input-label">Texto</label>
                                <textarea
                                    className="input-field"
                                    rows="3"
                                    value={selectedElement.text || ''}
                                    onChange={(e) => onUpdateField('text', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="input-label">Color texto</label>
                                <input
                                    className="input-field"
                                    type="color"
                                    value={
                                        String(selectedElement.color || '').startsWith('#')
                                            ? selectedElement.color
                                            : '#ffffff'
                                    }
                                    onChange={(e) => onUpdateField('color', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="input-label">Fuente</label>
                                <select
                                    className="input-field"
                                    value={selectedElement.fontFamily || 'Inter, system-ui, sans-serif'}
                                    onChange={(e) => onUpdateField('fontFamily', e.target.value)}
                                >
                                    <option value="Inter, system-ui, sans-serif">Inter</option>
                                    <option value="'Poppins', system-ui, sans-serif">Poppins</option>
                                    <option value="'Press Start 2P', cursive">Press Start 2P</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                </select>
                            </div>

                            <div>
                                <label className="input-label">Font size</label>
                                <input
                                    className="input-field"
                                    type="number"
                                    min="8"
                                    max="220"
                                    value={selectedElement.fontSize || 32}
                                    onChange={(e) => onUpdateField('fontSize', Number(e.target.value || 8))}
                                />
                            </div>

                            <div>
                                <label className="input-label">Peso</label>
                                <input
                                    className="input-field"
                                    type="number"
                                    min="100"
                                    max="900"
                                    step="100"
                                    value={selectedElement.fontWeight || 700}
                                    onChange={(e) => onUpdateField('fontWeight', Number(e.target.value || 700))}
                                />
                            </div>

                            <div>
                                <label className="input-label">Alineación</label>
                                <select
                                    className="input-field"
                                    value={selectedElement.textAlign || 'left'}
                                    onChange={(e) => onUpdateField('textAlign', e.target.value)}
                                >
                                    <option value="left">Izquierda</option>
                                    <option value="center">Centro</option>
                                    <option value="right">Derecha</option>
                                </select>
                            </div>
                        </>
                    ) : null}

                    {(selectedElement.type === 'image' || selectedElement.type === 'gif') ? (
                        <>
                            <div className="overlay-prop-full">
                                <label className="input-label">URL / src</label>
                                <input
                                    className="input-field"
                                    type="text"
                                    value={selectedElement.src || ''}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        onUpdateField('src', value)
                                        onUpdateField('type', /\.gif($|\?)/i.test(value) ? 'gif' : 'image')
                                    }}
                                />
                            </div>

                            <div>
                                <label className="input-label">Fit</label>
                                <select
                                    className="input-field"
                                    value={selectedElement.fit || 'contain'}
                                    onChange={(e) => onUpdateField('fit', e.target.value)}
                                >
                                    <option value="contain">Contain</option>
                                    <option value="cover">Cover</option>
                                    <option value="fill">Fill</option>
                                </select>
                            </div>
                        </>
                    ) : null}

                    <div>
                        <label className="input-label">Animación</label>
                        <select
                            className="input-field"
                            value={selectedElement.animation || ''}
                            onChange={(e) => onUpdateField('animation', e.target.value)}
                        >
                            <option value="">Ninguna</option>
                            <option value="breathe">Respiración</option>
                            <option value="float">Flotar</option>
                            <option value="shake">Sacudir</option>
                            <option value="flash">Flash</option>
                        </select>
                    </div>

                    <div>
                        <label className="input-label">Duración</label>
                        <input
                            className="input-field"
                            type="number"
                            min="0.2"
                            max="30"
                            step="0.1"
                            value={selectedElement.animationDuration || 3}
                            onChange={(e) => onUpdateField('animationDuration', Number(e.target.value || 3))}
                        />
                    </div>

                    <div className="overlay-prop-full">
                        <label className="input-label">Trigger vinculado</label>
                        <select
                            className="input-field"
                            value={selectedElement.trigger || ''}
                            onChange={(e) => onUpdateField('trigger', e.target.value)}
                        >
                            <option value="">Ninguno</option>
                            {actions.map((action, index) => (
                                <option
                                    key={`${action?.id || action?.name || 'action'}-${index}`}
                                    value={action?.id || action?.trigger || action?.name || ''}
                                >
                                    {action?.name || action?.trigger || `Acción ${index + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="overlay-prop-actions overlay-prop-full">
                        <button className="btn btn-secondary" type="button" onClick={onDuplicate}>
                            <i className="fa-solid fa-copy"></i> Duplicar
                        </button>

                        <button className="btn btn-secondary" type="button" onClick={onMoveUp}>
                            <i className="fa-solid fa-arrow-up"></i> Subir
                        </button>

                        <button className="btn btn-secondary" type="button" onClick={onMoveDown}>
                            <i className="fa-solid fa-arrow-down"></i> Bajar
                        </button>

                        <button className="btn btn-danger" type="button" onClick={onDelete}>
                            <i className="fa-solid fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OverlayPropertiesPanel
