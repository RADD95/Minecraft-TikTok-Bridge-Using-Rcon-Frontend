// src/components/ActionsView.jsx - Vista principal para gestionar las acciones personalizadas basadas en eventos de TikTok LIVE
import { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client'
import ActionFormModal from './ActionFormModal'

function ActionsView() {
  const [actions, setActions] = useState([])
  const [giftCatalog, setGiftCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)

  async function loadActions() {
    setLoading(true)
    setError('')

    try {
      const data = await apiGet('/api/actions')
      setActions(data.actions || [])
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las acciones')
      setActions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActions()
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

  const giftCatalogByName = useMemo(() => {
    const map = new Map()

    giftCatalog.forEach((gift) => {
      const key = gift.name.toLowerCase()
      if (!map.has(key)) map.set(key, gift)
    })

    return map
  }, [giftCatalog])

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (filterType !== 'all' && action.type !== filterType) return false

      const text = `${action.name || ''} ${action.trigger || ''} ${action.command || ''} ${action.type || ''}`.toLowerCase()
      return text.includes(search.toLowerCase().trim())
    })
  }, [actions, search, filterType])

  function openCreateModal() {
    setEditingIndex(null)
    setModalOpen(true)
  }

  function openEditModal(index) {
    setEditingIndex(index)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingIndex(null)
  }


  async function handleSave(actionData) {
    setError('')
    setMessage('')

    try {
      if (editingIndex !== null) {
        await apiPut(`/api/actions/${editingIndex}`, actionData)
        setMessage('Acción actualizada correctamente')
      } else {
        await apiPost('/api/actions', actionData)
        setMessage('Acción creada correctamente')
      }

      closeModal()
      await loadActions()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la acción')
    }
  }

  async function handleDelete(index) {
    const ok = window.confirm('¿Eliminar esta acción permanentemente?')
    if (!ok) return

    setError('')
    setMessage('')

    try {
      await apiDelete(`/api/actions/${index}`)
      setMessage('Acción eliminada')
      await loadActions()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la acción')
    }
  }

  return (
    <div className="view">
      <div className="header">
        <div>
          <h2>Acciones Configuradas</h2>
          <p className="header-subtitle">Gestiona los triggers y comandos</p>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="fa-solid fa-plus"></i> Nueva Acción
        </button>
      </div>

      {message ? <div className="success-box">{message}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <div className="card card-full">
        <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
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
                placeholder="Buscar por nombre, tipo, trigger o comando..."
                style={{ paddingLeft: '2.5rem' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input-field"
              style={{ width: '150px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="gift">Regalos</option>
              <option value="comment">Comentarios</option>
              <option value="like">Likes</option>
              <option value="follow">Follows</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="hint-text">Cargando acciones...</div>
        ) : filteredActions.length === 0 ? (
          <div className="hint-text">No hay acciones con esos filtros.</div>
        ) : (
          <div
            className="actions-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem'
            }}
          >
            {filteredActions.map((action) => {
              const originalIndex = actions.indexOf(action)
              const triggerKey = String(action.trigger || '').trim().toLowerCase()
              const matchedGift = action.type === 'gift' ? giftCatalogByName.get(triggerKey) : null

              const cardKey = `${originalIndex}-${action.name || 'action'}`
              const commandLines = String(action.command || '')
                .split(/[;\n]+/)
                .map((line) => line.trim())
                .filter(Boolean)

              const visibleCommands = commandLines


              return (
                <div className="action-card" key={cardKey}>
                  <div className="action-card-header">
                    <div className="action-card-tags">
                      <span className={`action-tag tag-${action.type || 'gift'}`}>
                        {action.type || 'gift'}
                      </span>

                      {action.trigger ? (
                        <span
                          className="action-tag action-tag-trigger"
                          style={{ background: 'rgba(251,191,36,0.12)', color: '#fde68a' }}
                          title={action.trigger}
                        >
                          {matchedGift?.image ? (
                            <img
                              className="action-tag-trigger-icon"
                              src={matchedGift.image}
                              alt={matchedGift.name}
                              loading="lazy"
                            />
                          ) : null}
                          {action.trigger}
                        </span>
                      ) : null}
                    </div>

                    <div className="action-controls">
                      <button className="btn-icon" onClick={() => openEditModal(originalIndex)}>
                        <i className="fa-solid fa-pen"></i>
                      </button>

                      <button className="btn-icon delete" onClick={() => handleDelete(originalIndex)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <div className="action-trigger" style={{ marginBottom: '0.5rem' }}>
                      {action.name || 'Sin nombre'}
                    </div>

                    <div
                      className="action-command-preview"
                      style={{ marginBottom: '0.75rem', whiteSpace: 'normal' }}
                    >
                      Queue: {action.useQueue ? 'Sí' : 'No'} · Combo: {action.repeatPerUnit ? 'Sí' : 'No'}
                    </div>

                    {commandLines.length === 0 ? (
                      <div className="hint-text">Sin comandos configurados.</div>
                    ) : (
                      <div
                        className="commands-container"
                        style={{
                          maxHeight: '220px',
                          overflowY: 'auto',
                          paddingRight: '0.25rem'
                        }}
                      >
                        {visibleCommands.map((command, index) => (
                          <div
                            key={`${cardKey}-cmd-${index}`}
                            className="command-pill"
                            title={command}
                            style={{
                              background: 'rgba(6, 182, 212, 0.08)',
                              border: '1px solid rgba(6, 182, 212, 0.2)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.5rem 0.75rem',
                              paddingLeft: '1.25rem',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.8rem',
                              color: 'var(--accent-mc)',
                              position: 'relative',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '0.5rem'
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                left: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--accent-mc)',
                                opacity: 0.6,
                                fontWeight: 600
                              }}
                            >
                              &gt;
                            </span>
                            {command}
                          </div>
                        ))}


                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ActionFormModal
        open={modalOpen}
        action={editingIndex !== null ? actions[editingIndex] : null}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  )
}

export default ActionsView