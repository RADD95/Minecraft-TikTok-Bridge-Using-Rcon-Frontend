// src/components/ActionsView.jsx - Vista principal para gestionar las acciones personalizadas basadas en eventos de TikTok LIVE
import { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client'
import ActionFormModal from './ActionFormModal'
import { fireSwal } from '../utils/swal'

function ActionsView() {
  const [actions, setActions] = useState([])
  const [folders, setFolders] = useState([])
  const [giftCatalog, setGiftCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [testingIndex, setTestingIndex] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState(new Set([''])) // '' es para acciones sin carpeta

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

  async function loadFolders() {
    try {
      const data = await apiGet('/api/folders')
      setFolders(data.folders || [])
    } catch (err) {
      console.error('Error cargando carpetas:', err)
      setFolders([])
    }
  }

  useEffect(() => {
    loadActions()
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

      const text = `${action.name || ''} ${action.trigger || ''} ${action.command || ''} ${action.type || ''} ${action.minecraftVersion || ''}`.toLowerCase()
      return text.includes(search.toLowerCase().trim())
    })
  }, [actions, search, filterType])

  // Agrupar acciones por carpeta
  const actionsByFolder = useMemo(() => {
    const grouped = {}

    filteredActions.forEach((action) => {
      const folder = action.folder || ''
      if (!grouped[folder]) {
        grouped[folder] = []
      }
      grouped[folder].push(action)
    })

    return grouped
  }, [filteredActions])

  const folderSections = useMemo(() => {
    const sections = []
    const seen = new Set()
    const sortedFolders = [...folders].sort((a, b) => {
      const aTs = Date.parse(a?.createdAt || '')
      const bTs = Date.parse(b?.createdAt || '')

      if (!Number.isNaN(aTs) && !Number.isNaN(bTs) && aTs !== bTs) {
        return aTs - bTs
      }

      return Number(a?.id || 0) - Number(b?.id || 0)
    })

    // Siempre arriba: acciones sin carpeta
    sections.push({
      key: '__no-folder__',
      folderName: '',
      displayName: '(Sin carpeta)',
      folder: null,
      folderActions: actionsByFolder[''] || []
    })
    seen.add('')

    // Carpetas existentes (incluyendo vacias) en el orden que llega del backend
    sortedFolders.forEach((folder) => {
      sections.push({
        key: `folder-${folder.id}`,
        folderName: folder.name,
        displayName: folder.name,
        folder,
        folderActions: actionsByFolder[folder.name] || []
      })
      seen.add(folder.name)
    })

    // Seguridad: acciones en carpetas huerfanas (sin registro en action_folders)
    Object.entries(actionsByFolder).forEach(([name, folderActions]) => {
      if (seen.has(name)) return
      sections.push({
        key: `orphan-${name}`,
        folderName: name,
        displayName: name || '(Sin carpeta)',
        folder: null,
        folderActions
      })
    })

    return sections
  }, [actionsByFolder, folders])

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

  async function handleCreateFolderPrompt() {
    const result = await fireSwal({
      title: 'Nueva carpeta',
      input: 'text',
      inputLabel: 'Nombre de la carpeta',
      inputPlaceholder: 'Ej: Recompensas épicas',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Ingresa un nombre válido'
        return null
      }
    })

    if (!result.isConfirmed) return

    const folderName = String(result.value || '').trim()
    if (!folderName) return

    setError('')
    setMessage('')

    try {
      await apiPost('/api/folders', { name: folderName })
      setMessage(`Carpeta "${folderName}" creada`)
      await loadFolders()
    } catch (err) {
      setError(err.message || 'No se pudo crear la carpeta')
    }
  }

  async function handleToggleFolder(folderId, currentEnabled) {
    setError('')
    setMessage('')

    try {
      await apiPut(`/api/folders/${folderId}/toggle`, { enabled: !currentEnabled })
      setMessage('Carpeta actualizada')
      await loadFolders()
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la carpeta')
    }
  }

  async function handleRenameFolder(folder) {
    const result = await fireSwal({
      title: 'Editar carpeta',
      input: 'text',
      inputLabel: 'Nuevo nombre',
      inputValue: folder?.name || '',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Ingresa un nombre válido'
        return null
      }
    })

    if (!result.isConfirmed) return

    const nextName = String(result.value || '').trim()
    if (!nextName || nextName === folder?.name) return

    setError('')
    setMessage('')

    try {
      await apiPut(`/api/folders/${folder.id}`, { name: nextName })
      setMessage(`Carpeta renombrada a "${nextName}"`)
      await loadFolders()
      await loadActions()
    } catch (err) {
      setError(err.message || 'No se pudo renombrar la carpeta')
    }
  }

  async function handleDeleteFolder(folderId) {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return

    const folderActionsCount = actions.filter((a) => a.folder === folder.name).length

    const result = await fireSwal({
      title: `Eliminar carpeta "${folder.name}"`,
      html: `<p style="color: var(--text-secondary); margin-bottom: 1rem;">Tiene <strong>${folderActionsCount}</strong> acción(es) en esta carpeta</p>`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Borrar carpeta y acciones',
      denyButtonText: 'Borrar solo carpeta',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'app-swal-popup folder-delete-swal',
        confirmButton: 'app-swal-confirm app-swal-danger',
        denyButton: 'app-swal-deny app-swal-info',
        cancelButton: 'app-swal-cancel app-swal-cancel-middle'
      }
    })

    if (result.isDenied) {
      // Borrar solo carpeta y mantener acciones
      setError('')
      setMessage('')

      try {
        const updatedActions = actions.map((a) => {
          if (a.folder === folder.name) {
            return { ...a, folder: '' }
          }
          return a
        })

        for (let i = 0; i < updatedActions.length; i++) {
          if (actions[i].folder === folder.name) {
            await apiPut(`/api/actions/${i}`, updatedActions[i])
          }
        }

        await apiDelete(`/api/folders/${folderId}`)
        setMessage(`Carpeta "${folder.name}" eliminada. Sus ${folderActionsCount} acción(es) se mantuvieron.`)
        await loadFolders()
        await loadActions()
      } catch (err) {
        setError(err.message || 'No se pudo eliminar solo la carpeta')
      }
    } else if (result.isConfirmed) {
      // Eliminar carpeta Y acciones
      setError('')
      setMessage('')

      try {
        const actionIndicesToDelete = []
        for (let i = 0; i < actions.length; i++) {
          if (actions[i].folder === folder.name) {
            actionIndicesToDelete.push(i)
          }
        }

        // Eliminar de atrás para adelante
        for (let i = actionIndicesToDelete.length - 1; i >= 0; i--) {
          const index = actionIndicesToDelete[i]
          await apiDelete(`/api/actions/${index}`)
        }

        await apiDelete(`/api/folders/${folderId}`)
        setMessage(
          `Carpeta "${folder.name}" y sus ${folderActionsCount} acción(es) han sido eliminadas`
        )
        await loadFolders()
        await loadActions()
      } catch (err) {
        setError(err.message || 'No se pudo eliminar la carpeta y sus acciones')
      }
    }
  }

  async function handleToggleAction(index, currentEnabled) {
    setError('')
    setMessage('')

    const action = actions[index]
    const actionFolder = folders.find((f) => f.name === action?.folder)

    if (actionFolder && !actionFolder.enabled) {
      setError('No puedes cambiar acciones de una carpeta deshabilitada')
      return
    }

    try {
      const updatedAction = {
        ...actions[index],
        enabled: !currentEnabled
      }
      await apiPut(`/api/actions/${index}`, updatedAction)
      setMessage('Acción actualizada')
      await loadActions()
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la acción')
    }
  }

  function toggleFolderExpanded(folderName) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderName)) {
        next.delete(folderName)
      } else {
        next.add(folderName)
      }
      return next
    })
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
    const result = await fireSwal({
      icon: 'warning',
      title: 'Eliminar acción',
      text: '¿Eliminar esta acción permanentemente?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    })
    if (!result.isConfirmed) return

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

  async function handleTest(index) {
    setError('')
    setMessage('')
    setTestingIndex(index)

    try {
      const result = await apiPost(`/api/actions/${index}/test`, {})
      const executed = Number(result?.executed || 0)
      const queued = Number(result?.queued || 0)
      const totalCommands = Array.isArray(result?.commands) ? result.commands.length : 0

      setMessage(`Test enviado: ${totalCommands} cmd(s) · ejecutados ${executed} · en cola ${queued}`)
    } catch (err) {
      setError(err.message || 'No se pudo ejecutar el test de la acción')
    } finally {
      setTestingIndex(null)
    }
  }

  return (
    <div className="view">
      <div className="header">
        <div>
          <h2>Acciones Configuradas</h2>
          <p className="header-subtitle">Gestiona los triggers y comandos</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleCreateFolderPrompt}>
            <i className="fa-solid fa-folder-plus"></i> Nueva Carpeta
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <i className="fa-solid fa-plus"></i> Nueva Acción
          </button>
        </div>
      </div>

      {message ? <div className="success-box">{message}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <div className="card card-full">
        {loading ? (
          <div className="hint-text">Cargando acciones...</div>
        ) : (
          <>
            {/* Sección de Acciones Agrupadas */}
            {filteredActions.length === 0 ? (
              <div className="hint-text" style={{ marginBottom: '1rem' }}>
                No hay acciones con esos filtros.
              </div>
            ) : null}

            <div>
              {folderSections.map(({ key, folderName, folderActions, folder, displayName }) => {
                const isFolderExpanded = expandedFolders.has(folderName)
                const isFolderDisabled = !!folder && !folder.enabled

                return (
                  <div key={key} style={{ marginBottom: '2rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: 'var(--bg-tertiary)',
                        border: `1px solid ${isFolderDisabled ? 'rgba(148, 163, 184, 0.35)' : 'rgba(6, 182, 212, 0.25)'}`,
                        borderRadius: 'var(--radius-md)',
                        boxShadow: isFolderDisabled
                          ? 'none'
                          : '0 0 0 1px rgba(6, 182, 212, 0.08) inset',
                        marginBottom: '1rem',
                        cursor: 'pointer',
                        opacity: isFolderDisabled ? 0.7 : 1,
                        filter: isFolderDisabled ? 'grayscale(1)' : 'none'
                      }}
                      onClick={() => toggleFolderExpanded(folderName)}
                    >
                      <i
                        className={`fa-solid fa-chevron-${isFolderExpanded ? 'down' : 'right'}`}
                        style={{ color: 'var(--accent-mc)' }}
                      ></i>
                      <h4 style={{ margin: 0, flex: 1, color: 'var(--accent-mc)' }}>
                        {displayName} ({folderActions.length})
                      </h4>

                      {folder ? (
                        <>
                          <button
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRenameFolder(folder)
                            }}
                            title="Editar nombre"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>

                                <button
                                  className="btn-icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleFolder(folder.id, folder.enabled)
                                  }}
                                  title={folder.enabled ? 'Deshabilitar carpeta' : 'Habilitar carpeta'}
                                >
                                  <i
                                    className={`fa-solid ${folder.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`}
                                  ></i>
                                </button>

                                <button
                                  className="btn-icon delete"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteFolder(folder.id)
                                  }}
                                  title="Eliminar carpeta"
                                >
                                  <i className="fa-solid fa-trash-alt"></i>
                                </button>

                                {!folder.enabled && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Deshabilitada
                                  </span>
                                )}
                        </>
                      ) : null}
                    </div>

                    {isFolderExpanded && (
                      <div
                        className="actions-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                          gap: '1rem',
                          opacity: isFolderDisabled ? 0.55 : 1,
                          filter: isFolderDisabled ? 'grayscale(1)' : 'none',
                          pointerEvents: isFolderDisabled ? 'none' : 'auto'
                        }}
                      >
                        {folderActions.length === 0 ? (
                          <div className="hint-text">No hay acciones en esta carpeta.</div>
                        ) : (
                          folderActions.map((action) => {
                                const originalIndex = actions.indexOf(action)
                                const triggerKey = String(action.trigger || '').trim().toLowerCase()
                                const matchedGift =
                                  action.type === 'gift' ? giftCatalogByName.get(triggerKey) : null

                                const cardKey = `${originalIndex}-${action.name || 'action'}`
                                const commandLines = String(action.command || '')
                                  .split(/[;\n]+/)
                                  .map((line) => line.trim())
                                  .filter(Boolean)

                                const visibleCommands = commandLines

                                return (
                                  <div
                                    className="action-card"
                                    key={cardKey}
                                    style={{
                                      opacity: action.enabled !== false ? 1 : 0.5,
                                      filter: action.enabled !== false ? 'none' : 'grayscale(1)'
                                    }}
                                  >
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

                                        {action.minecraftVersion && (
                                          <span
                                            className="action-tag"
                                            style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#86efac' }}
                                            title={`Versión: ${action.minecraftVersion}`}
                                          >
                                            <i className="fa-solid fa-cube" style={{ marginRight: '0.25rem' }}></i>
                                            {action.minecraftVersion}
                                          </span>
                                        )}
                                      </div>

                                      <div className="action-controls">
                                        <button
                                          className="btn-icon"
                                          onClick={() => handleTest(originalIndex)}
                                          disabled={testingIndex !== null || isFolderDisabled}
                                          title="Probar acción"
                                        >
                                          <i
                                            className={`fa-solid ${
                                              testingIndex === originalIndex ? 'fa-spinner fa-spin' : 'fa-play'
                                            }`}
                                          ></i>
                                        </button>

                                        <button
                                          className="btn-icon"
                                          onClick={() =>
                                            handleToggleAction(originalIndex, action.enabled !== false)
                                          }
                                          disabled={isFolderDisabled}
                                          title={action.enabled !== false ? 'Desabilitar' : 'Habilitar'}
                                        >
                                          <i
                                            className={`fa-solid ${
                                              action.enabled !== false
                                                ? 'fa-toggle-on'
                                                : 'fa-toggle-off'
                                            }`}
                                          ></i>
                                        </button>

                                        <button
                                          className="btn-icon"
                                          onClick={() => openEditModal(originalIndex)}
                                          disabled={isFolderDisabled}
                                        >
                                          <i className="fa-solid fa-pen"></i>
                                        </button>

                                        <button
                                          className="btn-icon delete"
                                          onClick={() => handleDelete(originalIndex)}
                                          disabled={isFolderDisabled}
                                        >
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
                                        Queue: {action.useQueue ? 'Sí' : 'No'} · Combo:{' '}
                                        {action.repeatPerUnit ? 'Sí' : 'No'}
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
                              })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ActionFormModal
        open={modalOpen}
        action={editingIndex !== null ? actions[editingIndex] : null}
        onClose={closeModal}
        onSave={handleSave}
        onFoldersUpdate={loadFolders}
        folders={folders}
      />
    </div>
  )
}

export default ActionsView