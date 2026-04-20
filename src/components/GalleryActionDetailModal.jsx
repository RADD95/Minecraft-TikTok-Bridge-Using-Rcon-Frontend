import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../api/client'

function GalleryActionDetailModal({ open, item, onClose, onImport }) {
  const [giftCatalog, setGiftCatalog] = useState([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (open) {
      setImporting(false)
    }
  }, [open, item?.id])

  useEffect(() => {
    let alive = true

    async function loadGiftCatalog() {
      try {
        const data = await apiGet('/api/gifts')
        if (!alive) return

        const list = Array.isArray(data?.gifts)
          ? data.gifts
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : []

        const normalized = list
          .map((gift, index) => ({
            id: gift?.id || gift?.gift_id || `gift-${index}`,
            name: String(gift?.name_en || gift?.name || gift?.title || '').trim(),
            image: gift?.image_url || gift?.image || gift?.icon || ''
          }))
          .filter((gift) => gift.name)

        setGiftCatalog(normalized)
      } catch {
        if (alive) setGiftCatalog([])
      }
    }

    loadGiftCatalog()

    return () => {
      alive = false
    }
  }, [])

  const giftCatalogByName = useMemo(() => {
    const map = new Map()
    giftCatalog.forEach((gift) => {
      const key = gift.name.toLowerCase()
      if (!map.has(key)) map.set(key, gift)
    })
    return map
  }, [giftCatalog])

  if (!open || !item) return null

  const triggerKey = String(item.trigger || '').trim().toLowerCase()
  const matchedGift = item.type === 'gift' ? giftCatalogByName.get(triggerKey) : null
  const displayTrigger = item.trigger ? (item.trigger.length > 30 ? item.trigger.substring(0, 27) + '...' : item.trigger) : ''

  const commandLines = String(item.command || '')
    .split(/[;\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)

  async function handleImportFromModal() {
    if (typeof onImport !== 'function' || importing) return

    try {
      setImporting(true)
      await onImport()
      onClose()
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '700px',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '1.5rem',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <h2 style={{ marginBottom: 0 }}>{item.title}</h2>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={handleImportFromModal}
                disabled={importing}
                title="Importar acción"
                style={{ padding: '0.45rem 0.75rem' }}
              >
                <i className="fa-solid fa-download"></i>{' '}
                {importing ? 'Importando...' : 'Importar'}
              </button>

              <button
                className="btn-icon"
                onClick={onClose}
                title="Cerrar"
                style={{ fontSize: '1.25rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            por @{item.authorName}
          </p>
          {item.description ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
              {item.description}
            </p>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tipo
            </label>
            <span className={`action-tag tag-${item.type || 'gift'}`}>
              {item.type || 'gift'}
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Versión Minecraft
            </label>
            <span className="action-tag" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
              MC {item.minecraftVersion}
            </span>
          </div>

          {item.trigger ? (
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Trigger
              </label>
              <span className="action-tag" style={{ background: 'rgba(251,191,36,0.12)', color: '#fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {matchedGift?.image ? (
                  <img
                    className="action-tag-trigger-icon"
                    src={matchedGift.image}
                    alt={matchedGift.name}
                    loading="lazy"
                    style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                  />
                ) : null}
                <span title={item.trigger}>{displayTrigger}</span>
              </span>
            </div>
          ) : null}

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Nombre de acción
            </label>
            <span className="action-tag" style={{ background: 'rgba(100, 116, 139, 0.12)', color: '#cbd5e1' }}>
              {item.name || 'sin nombre'}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Configuración
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cola</div>
              <div style={{ fontWeight: 600, color: item.useQueue ? '#22c55e' : '#ef4444' }}>
                {item.useQueue ? '✓ Habilitada' : '✗ Deshabilitada'}
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Repetir por regalo</div>
              <div style={{ fontWeight: 600, color: item.repeatPerUnit ? '#22c55e' : '#ef4444' }}>
                {item.repeatPerUnit ? '✓ Habilitada' : '✗ Deshabilitada'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Comandos
          </label>
          {commandLines.length === 0 ? (
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#cbd5e1'
            }}>
              Sin comandos
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {commandLines.map((command, index) => (
                <div
                  key={`cmd-${index}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#22c55e',
                    overflowX: 'auto',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    position: 'relative',
                    paddingLeft: '2.5rem'
                  }}
                >
                  <span style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                    {index + 1}.
                  </span>
                  {command}
                </div>
              ))}
            </div>
          )}
        </div>

        {item.tags && item.tags.length > 0 ? (
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Tags
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {item.tags.map((tag) => (
                <span key={`tag-${tag}`} className="action-tag" style={{ background: 'rgba(6,182,212,0.12)', color: '#67e8f9' }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  )
}

export default GalleryActionDetailModal
