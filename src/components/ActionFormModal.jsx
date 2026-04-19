// src/components/ActionFormModal.jsx - Componente modal para crear o editar acciones personalizadas basadas en eventos de TikTok LIVE
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../api/client'

const defaultAction = {
  name: '',
  type: 'gift',
  trigger: '',
  command: '',
  useQueue: true,
  repeatPerUnit: false
}

function ActionFormModal({ open, action, onClose, onSave }) {
  const [form, setForm] = useState(defaultAction)
  const [giftCatalog, setGiftCatalog] = useState([])
  const [giftSuggestionsOpen, setGiftSuggestionsOpen] = useState(false)
  const [giftLoading, setGiftLoading] = useState(false)
  const giftAutocompleteRef = useRef(null)

  useEffect(() => {
    if (action) {
      setForm({
        name: action.name || '',
        type: action.type || 'gift',
        trigger: action.trigger || '',
        command: action.command || '',
        useQueue: !!action.useQueue,
        repeatPerUnit: !!action.repeatPerUnit
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

  const giftSuggestions = useMemo(() => {
    if (form.type !== 'gift') return []

    const term = form.trigger.trim().toLowerCase()
    if (!term) return giftCatalog.slice(0, 8)

    const ranked = giftCatalog
      .map((gift) => {
        const name = gift.name.toLowerCase()
        const words = name.split(/\s+/).filter(Boolean)

        if (name === term) return { gift, rank: 0 }
        if (name.startsWith(term)) return { gift, rank: 1 }
        if (words.some((word) => word.startsWith(term))) return { gift, rank: 2 }
        if (name.includes(term)) return { gift, rank: 3 }

        return null
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank
        if (a.gift.name.length !== b.gift.name.length) return a.gift.name.length - b.gift.name.length
        return a.gift.name.localeCompare(b.gift.name)
      })

    // Cuando ya hay resultados fuertes (exact/prefix), ocultamos coincidencias débiles.
    const hasStrongMatches = ranked.some((entry) => entry.rank <= 2)
    const filtered = hasStrongMatches ? ranked.filter((entry) => entry.rank <= 2) : ranked

    return filtered
      .slice(0, 8)
      .map((entry) => entry.gift)
  }, [form.type, form.trigger, giftCatalog])

  const selectedGift = useMemo(() => {
    if (form.type !== 'gift') return null
    const trigger = form.trigger.trim().toLowerCase()
    if (!trigger) return null

    return giftCatalog.find((gift) => gift.name.toLowerCase() === trigger) || null
  }, [form.type, form.trigger, giftCatalog])

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

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.command.trim()) {
      alert('El comando es requerido')
      return
    }

    onSave({
      ...form,
      name: form.name.trim(),
      trigger: form.type === 'follow' ? '' : form.trigger.trim(),
      command: form.command.trim()
    })
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