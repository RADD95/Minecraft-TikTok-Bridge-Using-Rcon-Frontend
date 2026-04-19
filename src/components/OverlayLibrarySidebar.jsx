function OverlayLibrarySidebar({
    accentClassName,
    filter,
    iconClass,
    items,
    onFilterChange,
    onImageError,
    onItemClick,
    placeholder,
    title,
}) {
    return (
        <div className="overlay-left-column">
            <div className="overlay-panel-header">
                <div className="overlay-panel-title">
                    <i className={iconClass} style={{ color: accentClassName }}></i>
                    <span>{title}</span>
                </div>

                <input
                    className="input-field overlay-mini-search"
                    type="text"
                    placeholder="Filtrar..."
                    value={filter}
                    onChange={(e) => onFilterChange(e.target.value)}
                />
            </div>

            <div className="overlay-library-scroll">
                <div className="overlay-library-list">
                    {items.length === 0 ? (
                        <div className="hint-text" style={{ padding: '1rem', textAlign: 'center' }}>
                            {placeholder || 'No hay elementos'}
                        </div>
                    ) : (
                        items.map((item, index) => {
                            const name = item.__name || item.name || `Item ${index + 1}`
                            const image = item.__cachedImage || item.__image || null
                            const subtitle = item.__subtitle || ''

                            return (
                                <button
                                    key={`${name}-${index}`}
                                    type="button"
                                    className="overlay-library-item"
                                    onClick={() => image && onItemClick(item)}
                                    disabled={!image}
                                    title={image ? name : 'Este elemento no tiene imagen'}
                                >
                                    {image ? (
                                        <img
                                            src={image}
                                            alt={name}
                                            loading="lazy"
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                            onError={() => onImageError?.(image)}
                                        />
                                    ) : (
                                        <div
                                            className="overlay-library-item img-fallback"
                                            style={{
                                                width: 46,
                                                height: 46,
                                                borderRadius: 8,
                                                background: 'rgba(255,255,255,0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                color: 'var(--text-muted)',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            N/A
                                        </div>
                                    )}

                                    <div className="overlay-library-item-body">
                                        <span className="overlay-library-item-title">{name}</span>
                                        <span className="overlay-library-item-sub">{subtitle}</span>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

export default OverlayLibrarySidebar
