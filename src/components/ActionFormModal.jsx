// src/components/ActionFormModal.jsx - Componente modal para crear o editar acciones personalizadas basadas en eventos de TikTok LIVE
import { useEffect, useState } from 'react'

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

          <div className="form-group">
            <label>Trigger</label>
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
              onChange={(e) => setForm((prev) => ({ ...prev, trigger: e.target.value }))}
            />
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