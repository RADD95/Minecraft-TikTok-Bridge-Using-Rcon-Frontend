import { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client'
import GalleryPublishModal from './GalleryPublishModal'
import GalleryActionDetailModal from './GalleryActionDetailModal'
import GalleryEditModal from './GalleryEditModal'
import { fireSwal } from '../utils/swal'

function GalleryView({ user }) {
  const [items, setItems] = useState([])
  const [myActions, setMyActions] = useState([])
  const [folders, setFolders] = useState([])
  const [giftCatalog, setGiftCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [mineOnly, setMineOnly] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [editUpdating, setEditUpdating] = useState(false)

  const isAdmin = user?.role === 'admin'

  const giftCatalogByName = useMemo(() => {
    const map = new Map()
    giftCatalog.forEach((gift) => {
      const key = gift.name.toLowerCase()
      if (!map.has(key)) map.set(key, gift)
    })
    return map
  }, [giftCatalog])

  async function loadGallery({ silent = false } = {}) {
    if (!silent) setLoading(true)

    try {
      const query = new URLSearchParams()
      if (type !== 'all') query.set('type', type)
      if (mineOnly) query.set('mine', '1')

      const qs = query.toString()
      const data = await apiGet(`/api/gallery/actions${qs ? `?${qs}` : ''}`)
      const allItems = Array.isArray(data?.items) ? data.items : []
      
      // Filtrado en cliente para búsqueda en tiempo real
      const filtered = allItems.filter((item) => {
        if (!search.trim()) return true
        
        const searchLower = search.toLowerCase().trim()
        const tagsText = Array.isArray(item.tags) ? item.tags.join(' ') : ''
        const searchableText = `${
          item.title || ''
        } ${
          item.trigger || ''
        } ${
          item.name || ''
        } ${
          item.description || ''
        } ${
          item.minecraftVersion || ''
        } ${
          item.type || ''
        } ${
          item.command || ''
        } ${
          item.authorName || ''
        } ${
          tagsText
        } ${
          item.importsCount || ''
        }`.toLowerCase()
        
        return searchableText.includes(searchLower)
      })
      
      setItems(filtered)
    } catch (err) {
      setError(err.message || 'No se pudo cargar la galeria')
      setItems([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function loadMyActions() {
    try {
      const data = await apiGet('/api/actions')
      const actions = Array.isArray(data?.actions) ? data.actions : []
      setMyActions(actions)
    } catch {
      setMyActions([])
    }
  }

  async function loadFolders() {
    try {
      const data = await apiGet('/api/folders')
      setFolders(Array.isArray(data?.folders) ? data.folders : [])
    } catch {
      setFolders([])
    }
  }

  useEffect(() => {
    loadGallery()
  }, [type, mineOnly, search])

  useEffect(() => {
    loadMyActions()
    loadFolders()
  }, [])

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

  // La búsqueda ahora es activa en tiempo real

  async function handlePublish(publishData) {
    setError('')
    setMessage('')

    try {
      await apiPost('/api/gallery/actions', publishData)
      setMessage('Accion publicada en la galeria')
      await loadGallery({ silent: true })
    } catch (err) {
      setError(err.message || 'No se pudo publicar la accion')
    }
  }

  async function handleImport(item, options = {}) {
    if (!item?.id) return

    let folder = String(options.folder || '').trim()

    if (options.askFolder) {
      const folderOptions = {
        '': 'Sin carpeta'
      }

      folders.forEach((f) => {
        if (f?.name) {
          folderOptions[f.name] = f.name
        }
      })

      const folderPick = await fireSwal({
        title: 'Importar acción',
        text: 'Elige carpeta destino (opcional)',
        input: 'select',
        inputOptions: folderOptions,
        inputValue: folder,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
      })

      if (!folderPick.isConfirmed) return
      folder = String(folderPick.value || '').trim()
    }

    const normalizedCommand = String(item?.command || '').trim()

    let latestActions = myActions
    try {
      const latestData = await apiGet('/api/actions')
      latestActions = Array.isArray(latestData?.actions) ? latestData.actions : []
      setMyActions(latestActions)
    } catch {
      // Si falla el refresh, usar el estado local actual como respaldo.
      latestActions = myActions
    }

    const duplicateCount = latestActions.filter((action) => {
      return String(action?.command || '').trim() === normalizedCommand
    }).length

    if (duplicateCount > 0) {
      const warning = await fireSwal({
        icon: 'warning',
        title: 'Comando ya existente',
        html: `<p>Ya tienes <strong>${duplicateCount}</strong> acción(es) con este comando.</p><p>¿Importar de todas formas?</p>`,
        showCancelButton: true,
        confirmButtonText: 'Sí, importar igual',
        cancelButtonText: 'Cancelar'
      })

      if (!warning.isConfirmed) return
    }

    setError('')
    setMessage('')

    try {
      await apiPost(`/api/gallery/actions/${item.id}/import`, { folder })
      setMessage(folder ? `Accion importada a la carpeta "${folder}"` : 'Accion importada a tus acciones')
      await loadMyActions()
      await loadFolders()
      await loadGallery({ silent: true })
    } catch (err) {
      setError(err.message || 'No se pudo importar la accion')
    }
  }

  async function handleDelete(id) {
    const result = await fireSwal({
      icon: 'warning',
      title: 'Borrar acción de galería',
      text: '¿Borrar esta acción de la galería?',
      showCancelButton: true,
      confirmButtonText: 'Borrar',
      cancelButtonText: 'Cancelar'
    })
    if (!result.isConfirmed) return

    setError('')
    setMessage('')

    try {
      await apiDelete(`/api/gallery/actions/${id}`)
      setMessage('Accion borrada de la galeria')
      await loadGallery({ silent: true })
    } catch (err) {
      setError(err.message || 'No se pudo borrar la accion')
    }
  }

  async function handleEditOpen(item) {
    setEditItem(item)
    setEditModalOpen(true)
  }

  async function handleEditUpdate(id, updateData) {
    setEditUpdating(true)

    try {
      await apiPut(`/api/gallery/actions/${id}`, updateData)
      setMessage('Accion actualizada exitosamente')
      await loadGallery({ silent: true })
      setEditModalOpen(false)
      setEditItem(null)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la accion')
      throw err
    } finally {
      setEditUpdating(false)
    }
  }

  return (
    <div className="view">
      <div className="header">
        <div>
          <h2>Galeria de Acciones</h2>
          <p className="header-subtitle">Comparte e importa acciones de la comunidad</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setPublishModalOpen(true)}
        >
          <i className="fa-solid fa-plus"></i> Publicar una accion
        </button>
      </div>

      {message ? <div className="success-box">{message}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <div className="card card-full">
        <div className="search-bar" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en galeria..."
              style={{ minWidth: '240px', flex: 1 }}
            />

            <select className="input-field" value={type} onChange={(e) => setType(e.target.value)} style={{ width: '140px' }}>
              <option value="all">Todos</option>
              <option value="gift">Gift</option>
              <option value="comment">Comment</option>
              <option value="like">Like</option>
              <option value="follow">Follow</option>
            </select>

            <label className="toggle-container" style={{ margin: 0 }}>
              <span className="toggle-label">Solo mias</span>
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
              <div className="toggle-switch">
                <span className="toggle-slider"></span>
              </div>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="hint-text">Cargando galeria...</div>
        ) : items.length === 0 ? (
          <div className="hint-text">No hay acciones publicadas con esos filtros.</div>
        ) : (
          <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', gridAutoRows: '1fr' }}>
            {items.map((item) => {
              const triggerKey = String(item.trigger || '').trim().toLowerCase()
              const matchedGift = item.type === 'gift' ? giftCatalogByName.get(triggerKey) : null
              const displayTrigger = item.trigger ? (item.trigger.length > 30 ? item.trigger.substring(0, 27) + '...' : item.trigger) : ''

              return (
              <div
                className="action-card"
                key={`gallery-${item.id}`}
                onClick={() => {
                  setDetailItem(item)
                  setDetailModalOpen(true)
                }}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              >
                <div className="action-card-header">
                  <div className="action-card-tags">
                    <span className={`action-tag tag-${item.type || 'gift'}`}>{item.type || 'gift'}</span>
                    {item.trigger ? (
                      <span
                        className="action-tag action-tag-trigger"
                        style={{ background: 'rgba(251,191,36,0.12)', color: '#fde68a' }}
                        title={item.trigger}
                      >
                        {matchedGift?.image ? (
                          <img
                            className="action-tag-trigger-icon"
                            src={matchedGift.image}
                            alt={matchedGift.name}
                            loading="lazy"
                          />
                        ) : null}
                        {displayTrigger}
                      </span>
                    ) : null}
                  </div>

                  <div className="gallery-card-header-right">
                    <div className="action-controls">
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleImport(item, { askFolder: true })
                        }}
                        title="Importar accion"
                      >
                        <i className="fa-solid fa-download"></i>
                      </button>

                      {item.canDelete || isAdmin ? (
                        <>
                          <button
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditOpen(item)
                            }}
                            title="Editar accion"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            className="btn-icon delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(item.id)
                            }}
                            title="Borrar de galeria"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </>
                      ) : null}
                    </div>

                    <div className="gallery-version-chip" title={`Minecraft ${item.minecraftVersion}`}>
                      MC {item.minecraftVersion}
                    </div>
                  </div>
                </div>

                <div className="gallery-card-body">
                  <div className="action-trigger" style={{ marginBottom: '0.35rem' }}>{item.title}</div>
                  {item.description ? (
                    <div className="gallery-card-description" title={item.description}>
                      {item.description}
                    </div>
                  ) : null}

                  <div className="gallery-card-meta-grid">
                    <div className="command-pill" style={{ fontSize: '0.8rem', background: 'rgba(100, 116, 139, 0.12)', color: '#cbd5e1' }}>
                      Imports: {item.importsCount || 0}
                    </div>
                  </div>

                  <div className="gallery-card-footer">
                    <div className="action-command-preview" style={{ fontSize: '0.8rem' }}>
                      Queue: {item.useQueue ? '✓' : '✗'} · Combo: {item.repeatPerUnit ? '✓' : '✗'}
                    </div>

                    <div className="gallery-card-author" title={`@${item.authorName || 'anon'}`}>
                      @{item.authorName || 'anon'}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      <GalleryPublishModal
        open={publishModalOpen}
        myActions={myActions}
        items={items}
        onClose={() => setPublishModalOpen(false)}
        onPublish={handlePublish}
      />

      <GalleryActionDetailModal
        open={detailModalOpen}
        item={detailItem}
        onClose={() => setDetailModalOpen(false)}
        onImport={() => handleImport(detailItem, { askFolder: true })}
      />

      <GalleryEditModal
        open={editModalOpen}
        item={editItem}
        onClose={() => {
          setEditModalOpen(false)
          setEditItem(null)
        }}
        onUpdate={handleEditUpdate}
        updating={editUpdating}
      />
    </div>
  )
}

export default GalleryView
