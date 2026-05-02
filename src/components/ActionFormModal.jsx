// src/components/ActionFormModal.jsx - Componente modal para crear o editar acciones personalizadas basadas en eventos de TikTok LIVE
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost, resolveBackendUrl } from '../api/client'
import { fireSwal } from '../utils/swal'

const defaultAction = {
  name: '',
  type: 'gift',
  trigger: '',
  command: '',
  useQueue: false,
  repeatPerUnit: true,
  audioEnabled: false,
  audioAsset: '',
  audioVolume: 70,
  audioWaitForFinish: false,
  audioReplaceCurrent: false,
  audioPlayOncePerCombo: false,
  minecraftVersion: '',
  folder: '',
  enabled: true
}

function ActionFormModal({ open, action, onClose, onSave, onFoldersUpdate }) {
  const [form, setForm] = useState(defaultAction)
  const [giftCatalog, setGiftCatalog] = useState([])
  const [giftSuggestionsOpen, setGiftSuggestionsOpen] = useState(false)
  const [giftLoading, setGiftLoading] = useState(false)
  const [folders, setFolders] = useState([])
  const [folderSuggestionsOpen, setFolderSuggestionsOpen] = useState(false)
  const [folderLoading, setFolderLoading] = useState(false)
  const [audioUploading, setAudioUploading] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const previewRef = useRef(null)
  const giftAutocompleteRef = useRef(null)
  const folderAutocompleteRef = useRef(null)

  useEffect(() => {
    if (action) {
      setForm({
        name: action.name || '',
        type: action.type || 'gift',
        trigger: action.trigger || '',
        command: action.command || '',
        useQueue: !!action.useQueue,
        repeatPerUnit: !!action.repeatPerUnit,
        audioEnabled: !!action.audioEnabled,
        audioAsset: action.audioAsset || '',
        audioVolume: Number.isFinite(Number(action.audioVolume)) ? Number(action.audioVolume) : 70,
        audioWaitForFinish: !!action.audioWaitForFinish,
        audioReplaceCurrent: !!action.audioReplaceCurrent,
        audioPlayOncePerCombo: !!action.audioPlayOncePerCombo,
        minecraftVersion: action.minecraftVersion || '',
        folder: action.folder || '',
        enabled: action.enabled !== false
      })
    } else {
      setForm(defaultAction)
    }
  }, [action, open])

  useEffect(() => {
    if (!open) return

    let alive = true

    async function loadGiftCatalog() {
      if (giftCatalog.length > 0) return

      setGiftLoading(true)
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
        if (!alive) return
        setGiftCatalog([])
      } finally {
        if (alive) setGiftLoading(false)
      }
    }

    loadGiftCatalog()

    return () => {
      alive = false
    }
  }, [open, giftCatalog.length])

  useEffect(() => {
    if (!open) return

    function handleOutsideClick(event) {
      if (!giftAutocompleteRef.current) return
      if (!giftAutocompleteRef.current.contains(event.target)) {
        setGiftSuggestionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  useEffect(() => {
    if (!open) return

    let alive = true

    async function loadFolders() {
      setFolderLoading(true)
      try {
        const data = await apiGet('/api/folders')
        if (!alive) return

        const folderList = Array.isArray(data?.folders) ? data.folders : []
        setFolders(folderList)
      } catch {
        if (alive) setFolders([])
      } finally {
        if (alive) setFolderLoading(false)
      }
    }

    loadFolders()

    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleOutsideClick(event) {
      if (!folderAutocompleteRef.current) return
      if (!folderAutocompleteRef.current.contains(event.target)) {
        setFolderSuggestionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const giftSuggestions = useMemo(() => {
    if (form.type !== 'gift') return []

    const term = form.trigger.trim().toLowerCase()
    if (!term) return giftCatalog.slice(0, 8)

    const ranked = giftCatalog
      .map((gift) => {
        const name = gift.name.toLowerCase()
        const words = name.split(/\s+/).filter(Boolean)

        if (name === term) return { gift, rank: 0 }
        if (words.some((word) => word === term)) return { gift, rank: 1 }
        if (name.startsWith(term)) return { gift, rank: 2 }
        if (words.some((word) => word.startsWith(term))) return { gift, rank: 3 }
        if (name.includes(term)) return { gift, rank: 4 }

        return null
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank
        if (a.gift.name.length !== b.gift.name.length) return a.gift.name.length - b.gift.name.length
        return a.gift.name.localeCompare(b.gift.name)
      })

    return ranked
      .slice(0, 20)
      .map((entry) => entry.gift)
  }, [form.type, form.trigger, giftCatalog])

  const selectedGift = useMemo(() => {
    if (form.type !== 'gift') return null
    const trigger = form.trigger.trim().toLowerCase()
    if (!trigger) return null

    return giftCatalog.find((gift) => gift.name.toLowerCase() === trigger) || null
  }, [form.type, form.trigger, giftCatalog])

  const folderSuggestions = useMemo(() => {
    const term = form.folder.trim().toLowerCase()
    if (!term) return folders.map((f) => ({ name: f.name, isExisting: true }))

    const matching = folders.filter((f) => f.name.toLowerCase().includes(term))

    // Mostrar carpetas que coincidan
    const results = matching.map((f) => ({ name: f.name, isExisting: true }))

    // Si el input no coincide exactamente con ninguna, permitir crear nueva
    const exactMatch = folders.find((f) => f.name.toLowerCase() === term)
    if (!exactMatch && term.length > 0) {
      results.unshift({ name: term, isExisting: false, isNew: true })
    }

    return results
  }, [form.folder, folders])

  if (!open) return null

  function getTriggerHint(type) {
    switch (type) {
      case 'gift':
        return 'Nombre exacto del regalo'
      case 'comment':
        return 'Texto a detectar. Vacío = cualquier comentario'
      case 'like':
        return 'Cada X likes. Ejemplo: 10'
      case 'follow':
        return 'No requiere trigger'
      default:
        return ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.command.trim()) {
      await fireSwal({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El comando es requerido',
        confirmButtonText: 'Entendido'
      })
      return
    }

    const trimmedFolder = form.folder.trim()

    // Si hay carpeta y no existe, crearla
    if (trimmedFolder && !folders.find((f) => f.name === trimmedFolder)) {
      try {
        await apiPost('/api/folders', { name: trimmedFolder })
        // Notificar al padre que se creó una carpeta
        if (onFoldersUpdate) onFoldersUpdate()
      } catch (err) {
        console.error('Error creando carpeta:', err)
        // Continuar igual, se puede guardar sin carpeta
      }
    }

    onSave({
      ...form,
      name: form.name.trim(),
      trigger: form.type === 'follow' ? '' : form.trigger.trim(),
      command: form.command.trim(),
      audioAsset: form.audioAsset.trim(),
      audioVolume: Math.max(0, Math.min(100, Number.parseInt(form.audioVolume, 10) || 70)),
      audioWaitForFinish: !!form.audioWaitForFinish,
      audioReplaceCurrent: !!form.audioReplaceCurrent,
      audioPlayOncePerCombo: !!form.audioPlayOncePerCombo,
      minecraftVersion: form.minecraftVersion.trim(),
      folder: trimmedFolder,
      enabled: form.enabled
    })
  }

  async function handleAudioFilePicked(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.type.startsWith('audio/')) {
      await fireSwal({
        icon: 'warning',
        title: 'Archivo inválido',
        text: 'Selecciona un archivo de audio válido',
        confirmButtonText: 'Entendido'
      })
      return
    }

    try {
      setAudioUploading(true)

      const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
        reader.readAsDataURL(file)
      })

      const result = await apiPost('/api/cache-audio', {
        fileName: file.name,
        mimeType: file.type,
        dataBase64
      })

      if (result?.cachedUrl) {
        setForm((prev) => ({ ...prev, audioAsset: result.cachedUrl }))
      }
    } catch (err) {
      await fireSwal({
        icon: 'error',
        title: 'Error subiendo audio',
        text: err?.message || 'No se pudo cachear el audio',
        confirmButtonText: 'Entendido'
      })
    } finally {
      setAudioUploading(false)
    }
  }

  function stopPreview() {
    try {
      if (previewRef.current) {
        previewRef.current.pause()
        previewRef.current.currentTime = 0
        previewRef.current = null
      }
    } catch {}

    setPreviewPlaying(false)
  }

  async function playPreview() {
    const asset = String(form.audioAsset || '').trim()
    if (!asset) return

    try {
      stopPreview()
      const el = new Audio(resolveBackendUrl(asset))
      el.volume = Math.max(0, Math.min(1, (Number.parseInt(form.audioVolume, 10) || 70) / 100))
      previewRef.current = el

      el.onended = () => {
        setPreviewPlaying(false)
        previewRef.current = null
      }

      el.onerror = () => {
        setPreviewPlaying(false)
        previewRef.current = null
      }

      await el.play()
      setPreviewPlaying(true)
    } catch {
      setPreviewPlaying(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-lg)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem'
        }}
      >
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-mc)' }}>
          {action ? 'Editar Acción' : 'Nueva Acción'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre opcional</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Alerta Rose"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Tipo</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  type: e.target.value,
                  trigger: e.target.value === 'follow' ? '' : prev.trigger
                }))
              }
            >
              <option value="gift">Regalo</option>
              <option value="comment">Comentario</option>
              <option value="like">Like</option>
              <option value="follow">Follow</option>
            </select>
          </div>

          <div className="form-group" ref={giftAutocompleteRef}>
            <label>Trigger</label>
            <div className="gift-trigger-row">
              <input
                type="text"
                className="input-field"
                placeholder={
                  form.type === 'gift'
                    ? 'Rose'
                    : form.type === 'comment'
                      ? 'hola'
                      : form.type === 'like'
                        ? '10'
                        : ''
                }
                value={form.trigger}
                disabled={form.type === 'follow'}
                onFocus={() => {
                  if (form.type === 'gift') setGiftSuggestionsOpen(true)
                }}
                onChange={(e) => {
                  const value = e.target.value
                  setForm((prev) => ({ ...prev, trigger: value }))
                  if (form.type === 'gift') setGiftSuggestionsOpen(true)
                }}
              />

              {form.type === 'gift' ? (
                selectedGift?.image ? (
                  <img className="gift-trigger-preview" src={selectedGift.image} alt={selectedGift.name} />
                ) : (
                  <div className="gift-trigger-preview gift-trigger-preview-empty">
                    <i className="fa-brands fa-tiktok"></i>
                  </div>
                )
              ) : null}
            </div>

            {form.type === 'gift' && giftSuggestionsOpen && !form.disabled ? (
              <div className="gift-suggestions-popover">
                {giftLoading ? (
                  <div className="gift-suggestion-empty">Cargando regalos...</div>
                ) : giftSuggestions.length === 0 ? (
                  <div className="gift-suggestion-empty">Sin coincidencias</div>
                ) : (
                  giftSuggestions.map((gift, suggestionIndex) => (
                    <button
                      key={`${gift.id}-${gift.name}-${suggestionIndex}`}
                      type="button"
                      className="gift-suggestion-item"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, trigger: gift.name }))
                        setGiftSuggestionsOpen(false)
                      }}
                    >
                      {gift.image ? <img src={gift.image} alt={gift.name} /> : <span className="gift-suggestion-dot">TT</span>}
                      <span>{gift.name}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}

            <p className="hint-text">{getTriggerHint(form.type)}</p>
          </div>

          <div className="form-group">
            <label>Comando(s)</label>
            <textarea
              className="code-editor"
              style={{ minHeight: '100px' }}
              placeholder="/say hola"
              value={form.command}
              onChange={(e) => setForm((prev) => ({ ...prev, command: e.target.value }))}
            />
            <p className="hint-text">
              Recuerda separar comandos con punto y coma (;) para múltiples comandos
            </p>
          </div>

          <div className="form-group">
            <label className="toggle-container">
              <span className="toggle-label">Usar cola</span>
              <input
                type="checkbox"
                checked={form.useQueue}
                onChange={(e) => setForm((prev) => ({ ...prev, useQueue: e.target.checked }))}
              />
              <div className="toggle-switch">
                <span className="toggle-slider"></span>
              </div>
              <span className="toggle-hint">Comandos secuenciales</span>
            </label>
          </div>

          <div className="form-group">
            <label className="toggle-container">
              <span className="toggle-label">Repetir combos por regalo</span>
              <input
                type="checkbox"
                checked={form.repeatPerUnit}
                onChange={(e) => setForm((prev) => ({ ...prev, repeatPerUnit: e.target.checked }))}
              />
              <div className="toggle-switch">
                <span className="toggle-slider"></span>
              </div>
              <span className="toggle-hint">Ejecuta una vez por cada unidad del combo</span>
            </label>
          </div>

          <div className="form-group">
            <label>Versión de Minecraft (opcional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: 1.20.1, 1.12.2"
              value={form.minecraftVersion}
              onChange={(e) => setForm((prev) => ({ ...prev, minecraftVersion: e.target.value }))}
            />
            <p className="hint-text">Útil para organizar acciones por servidor</p>
          </div>

          <div className="form-group">
            <label>Carpeta (opcional)</label>
            <div className="folder-autocomplete-container" ref={folderAutocompleteRef} style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Server 1.20, Eventos, Decoración"
                value={form.folder}
                onFocus={() => {
                  if (folders.length > 0 || form.folder.trim()) setFolderSuggestionsOpen(true)
                }}
                onChange={(e) => {
                  const value = e.target.value
                  setForm((prev) => ({ ...prev, folder: value }))
                  if (value.trim()) setFolderSuggestionsOpen(true)
                }}
              />

              {folderSuggestionsOpen && !form.disabled ? (
                <div
                  className="folder-suggestions-popover"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10
                  }}
                >
                  {folderLoading ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Cargando...
                    </div>
                  ) : folderSuggestions.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Sin carpetas
                    </div>
                  ) : (
                    folderSuggestions.map((suggestion, idx) => (
                      <button
                        key={`folder-${idx}-${suggestion.name}`}
                        type="button"
                        className="folder-suggestion-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: idx < folderSuggestions.length - 1 ? '1px solid var(--bg-tertiary)' : 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                        onMouseDown={() => {
                          setForm((prev) => ({ ...prev, folder: suggestion.name }))
                          setFolderSuggestionsOpen(false)
                        }}
                      >
                        {suggestion.isNew ? (
                          <>
                            <i className="fa-solid fa-folder-plus" style={{ color: 'var(--accent-mc)' }}></i>
                            <span>
                              Crear: <strong>{suggestion.name}</strong>
                            </span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-folder" style={{ color: '#a855f7' }}></i>
                            <span>{suggestion.name}</span>
                          </>
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <p className="hint-text">Carpeta existente o crea una nueva escribiendo su nombre</p>
          </div>

          <div className="form-group">
            <label className="toggle-container">
              <span className="toggle-label">Habilitada</span>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              <div className="toggle-switch">
                <span className="toggle-slider"></span>
              </div>
              <span className="toggle-hint">Desabilita para desactivar sin eliminar</span>
            </label>
          </div>

          <div className="form-group">
            <label className="toggle-container">
              <span className="toggle-label">Activar audio</span>
              <input
                type="checkbox"
                checked={form.audioEnabled}
                onChange={(e) => setForm((prev) => ({ ...prev, audioEnabled: e.target.checked }))}
              />
              <div className="toggle-switch">
                <span className="toggle-slider"></span>
              </div>
              <span className="toggle-hint">Agrega sonido a esta acción</span>
            </label>
          </div>

          {form.audioEnabled ? (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Ruta o URL de audio</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: /cache/meow.mp3"
                value={form.audioAsset}
                onChange={(e) => setForm((prev) => ({ ...prev, audioAsset: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary" style={{ cursor: audioUploading ? 'not-allowed' : 'pointer', opacity: audioUploading ? 0.7 : 1 }}>
                  <i className="fa-solid fa-upload"></i> {audioUploading ? 'Subiendo...' : 'Subir audio'}
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFilePicked}
                    disabled={audioUploading}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => (previewPlaying ? stopPreview() : playPreview())}
                  disabled={!form.audioAsset}
                >
                  <i className={`fa-solid ${previewPlaying ? 'fa-stop' : 'fa-play'}`}></i> {previewPlaying ? 'Parar' : 'Reproducir'}
                </button>
              </div>
              <p className="hint-text">Puedes subir MP3, WAV u OGG y se guardará en cache.</p>
            </div>
          ) : null}

          {form.audioEnabled ? (
            <div className="form-group">
              <label>Volumen de la acción: {form.audioVolume}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.audioVolume}
                className="audio-volume-slider"
                onChange={(e) => setForm((prev) => ({ ...prev, audioVolume: Number.parseInt(e.target.value, 10) || 0 }))}
              />
              <p className="hint-text">Este volumen es por acción. El volumen global de arriba no detiene el audio.</p>
            </div>
          ) : null}

          {form.audioEnabled ? (
            <div className="form-group">
              <label className="toggle-container">
                <span className="toggle-label">Esperar a que termine el audio antes de seguir</span>
                <input
                  type="checkbox"
                  checked={form.audioWaitForFinish}
                  onChange={(e) => setForm((prev) => ({ ...prev, audioWaitForFinish: e.target.checked }))}
                />
                <div className="toggle-switch">
                  <span className="toggle-slider"></span>
                </div>
                <span className="toggle-hint">Bloquea solo la secuencia de esta acción mientras suena su audio.</span>
              </label>
            </div>
          ) : null}

          {form.audioEnabled ? (
            <div className="form-group">
              <label className="toggle-container">
                <span className="toggle-label">Reemplazar audios activos al dispararse</span>
                <input
                  type="checkbox"
                  checked={form.audioReplaceCurrent}
                  onChange={(e) => setForm((prev) => ({ ...prev, audioReplaceCurrent: e.target.checked }))}
                />
                <div className="toggle-switch">
                  <span className="toggle-slider"></span>
                </div>
                <span className="toggle-hint">Si lo activas, este audio corta los que estén sonando.</span>
              </label>
            </div>
          ) : null}

          {form.audioEnabled ? (
            <div className="form-group">
              <label className="toggle-container">
                <span className="toggle-label">Reproducir audio 1 sola vez por combo</span>
                <input
                  type="checkbox"
                  checked={form.audioPlayOncePerCombo}
                  onChange={(e) => setForm((prev) => ({ ...prev, audioPlayOncePerCombo: e.target.checked }))}
                />
                <div className="toggle-switch">
                  <span className="toggle-slider"></span>
                </div>
                <span className="toggle-hint">Desactívalo si quieres que el audio suene todas las veces del combo (ej: 20 rosas = 20 sonidos).</span>
              </label>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ActionFormModal