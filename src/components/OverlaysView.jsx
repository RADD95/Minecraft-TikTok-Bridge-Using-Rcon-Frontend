// src/components/OverlaysView.jsx - Vista React para listar, crear, duplicar y borrar overlays, abriendo el editor solo al seleccionar uno
import { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPost } from '../api/client'
import OverlayEditor from './OverlayEditor'

function generateOverlayId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `ovl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildEmptyOverlay() {
  return {
    id: generateOverlayId(),
    name: 'Nuevo overlay',
    canvas: {
      width: 1080,
      height: 1920,
      background: 'transparent'
    },
    elements: [],
    groups: [],
    preview: ''
  }
}

function normalizeOverlay(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  return {
    id: raw.id || generateOverlayId(),
    name: raw.name || 'Sin nombre',
    canvas: {
      width: Number(raw?.canvas?.width || 1080),
      height: Number(raw?.canvas?.height || 1920),
      background: raw?.canvas?.background || 'transparent'
    },
    elements: Array.isArray(raw?.elements) ? raw.elements : [],
    groups: Array.isArray(raw?.groups) ? raw.groups : [],
    preview: raw?.preview || '',
    createdAt: raw?.createdAt || raw?.createdat || '',
    updatedAt: raw?.updatedAt || raw?.updatedat || ''
  }
}

function getOverlayPublicUrl(overlayId) {
  const safeId = encodeURIComponent(String(overlayId || '').trim())
  const { origin } = window.location
  return `${origin}/overlay/${safeId}`
}

function OverlaysView() {
  const [overlays, setOverlays] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [editingOverlay, setEditingOverlay] = useState(null)

  async function loadOverlays() {
    setLoading(true)
    setError('')

    try {
      const data = await apiGet('/api/overlays')

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.overlays)
          ? data.overlays
          : []

      setOverlays(list.map(normalizeOverlay).filter(Boolean))
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los overlays')
      setOverlays([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverlays()
  }, [])

  const filteredOverlays = useMemo(() => {
    const term = search.toLowerCase().trim()

    return overlays.filter((overlay) => {
      const text = `${overlay.name || ''} ${overlay.id || ''} ${overlay.canvas?.width || ''} ${overlay.canvas?.height || ''}`.toLowerCase()
      return text.includes(term)
    })
  }, [overlays, search])

  async function handleCreate() {
    setCreating(true)
    setError('')
    setMessage('')

    try {
      const payload = buildEmptyOverlay()
      await apiPost('/api/overlays', payload)
      setMessage('Overlay creado correctamente')
      await loadOverlays()
      setEditingOverlay(payload)
    } catch (err) {
      setError(err.message || 'No se pudo crear el overlay')
    } finally {
      setCreating(false)
    }
  }

  async function handleDuplicate(overlay) {
    setError('')
    setMessage('')

    try {
      const payload = {
        ...overlay,
        id: generateOverlayId(),
        name: `${overlay.name || 'Overlay'} (copia)`
      }

      await apiPost('/api/overlays', payload)
      setMessage('Overlay duplicado correctamente')
      await loadOverlays()
    } catch (err) {
      setError(err.message || 'No se pudo duplicar el overlay')
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm('¿Eliminar este overlay permanentemente?')
    if (!ok) return

    setError('')
    setMessage('')

    try {
      await apiDelete(`/api/overlays/${id}`)
      setMessage('Overlay eliminado')
      if (editingOverlay?.id === id) {
        setEditingOverlay(null)
      }
      await loadOverlays()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el overlay')
    }
  }

  async function handleEditorSaved() {
    setMessage('Overlay guardado correctamente')
    await loadOverlays()
  }

  async function handleCopyObsLink(overlayId) {
    const url = getOverlayPublicUrl(overlayId)

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url)
      } else {
        const tmp = document.createElement('textarea')
        tmp.value = url
        tmp.setAttribute('readonly', 'true')
        tmp.style.position = 'fixed'
        tmp.style.opacity = '0'
        document.body.appendChild(tmp)
        tmp.select()
        document.execCommand('copy')
        document.body.removeChild(tmp)
      }

      setMessage('Enlace OBS copiado al portapapeles')
      setError('')
    } catch {
      setError('No se pudo copiar el enlace OBS')
    }
  }

  function handleOpenPreview(overlayId) {
    const url = getOverlayPublicUrl(overlayId)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (editingOverlay) {
    return (
      <OverlayEditor
        overlayId={editingOverlay.id}
        initialOverlay={editingOverlay}
        onBack={() => setEditingOverlay(null)}
        onSaved={handleEditorSaved}
      />
    )
  }

  return (
    <div className="view">
      <div className="header">
        <div>
          <h2>Overlays</h2>
          <p className="header-subtitle">Crea y abre overlays para editarlos</p>
        </div>

        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
          <i className="fa-solid fa-plus"></i> {creating ? 'Creando...' : 'Nuevo Overlay'}
        </button>
      </div>

      {message ? <div className="success-box">{message}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <div className="card card-full">
        <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <i
              className="fa-solid fa-search"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            ></i>

            <input
              type="text"
              className="input-field"
              placeholder="Buscar overlay por nombre o ID..."
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="hint-text">Cargando overlays...</div>
        ) : filteredOverlays.length === 0 ? (
          <div className="hint-text">No hay overlays todavía.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem'
            }}
          >
            {filteredOverlays.map((overlay) => {
              const elementCount = Array.isArray(overlay.elements) ? overlay.elements.length : 0
              const groupCount = Array.isArray(overlay.groups) ? overlay.groups.length : 0

              return (
                <div className="action-card" key={overlay.id}>
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      minHeight: '170px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      marginBottom: '1rem',
                      padding: '0.5rem'
                    }}
                  >
                    <iframe
                      key={`preview-${overlay.id}`}
                      title={`preview-${overlay.name || overlay.id}`}
                      src={getOverlayPublicUrl(overlay.id)}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '160px',
                        border: 'none',
                        borderRadius: '8px',
                        background: 'transparent',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div className="action-trigger" style={{ marginBottom: '0.35rem' }}>
                      {overlay.name || 'Sin nombre'}
                    </div>

                    <div className="action-command-preview" style={{ whiteSpace: 'normal' }}>
                      Canvas: {overlay.canvas.width} x {overlay.canvas.height}
                    </div>

                    <div
                      className="action-command-preview"
                      style={{ whiteSpace: 'normal', marginTop: '0.35rem' }}
                    >
                      Elementos: {elementCount} · Grupos: {groupCount}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => setEditingOverlay(overlay)}
                    >
                      <i className="fa-solid fa-pen"></i> Editar
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDuplicate(overlay)}
                    >
                      <i className="fa-solid fa-copy"></i> Duplicar
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => handleOpenPreview(overlay.id)}
                    >
                      <i className="fa-solid fa-up-right-from-square"></i> Abrir preview
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCopyObsLink(overlay.id)}
                    >
                      <i className="fa-solid fa-link"></i> Copiar enlace OBS
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(overlay.id)}
                    >
                      <i className="fa-solid fa-trash"></i> Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default OverlaysView