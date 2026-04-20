import { useEffect, useState } from 'react'

const defaultEditState = {
  title: '',
  description: '',
  minecraftVersion: '',
  tags: '',
  command: '',
  useQueue: false,
  repeatPerUnit: true
}

function GalleryEditModal({ open, item, onClose, onUpdate, updating = false }) {
  const [form, setForm] = useState(defaultEditState)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && item) {
      setForm({
        title: item.title || '',
        description: item.description || '',
        minecraftVersion: item.minecraftVersion || '',
        tags: item.tags?.join(', ') || '',
        command: item.command || '',
        useQueue: !!item.useQueue,
        repeatPerUnit: !!item.repeatPerUnit
      })
      setError('')
    }
  }, [open, item])

  if (!open || !item) return null

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.title.trim()) {
      setError('El titulo es requerido')
      return
    }

    if (!form.minecraftVersion.trim()) {
      setError('Version de Minecraft es requerida')
      return
    }

    if (!form.command.trim()) {
      setError('El comando es requerido')
      return
    }

    if (form.command.trim().length > 4000) {
      setError('Comando demasiado largo (max 4000 caracteres)')
      return
    }

    const versionRegex = /^[\d.]+$/
    if (!versionRegex.test(form.minecraftVersion.trim())) {
      setError('Version invalida. Solo numeros y puntos (ej: 1.20, 1.20.1)')
      return
    }

    try {
      await onUpdate(item.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        minecraftVersion: form.minecraftVersion.trim(),
        command: form.command.trim(),
        useQueue: !!form.useQueue,
        repeatPerUnit: !!form.repeatPerUnit,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      })
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la accion')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-lg)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Editar Accion</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {item.title}
            </p>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            title="Cerrar"
            style={{ fontSize: '1.25rem' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {error ? <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="input-row">
            <div className="form-group">
              <label>Titulo publico *</label>
              <input
                type="text"
                className="input-field"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Celebracion Finger Heart"
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label>Version de Minecraft *</label>
              <input
                type="text"
                className="input-field"
                value={form.minecraftVersion}
                onChange={(e) => setForm((prev) => ({ ...prev, minecraftVersion: e.target.value }))}
                placeholder="Ej: 1.20, 1.20.1, 1.21"
                disabled={updating}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tags (separados por coma)</label>
            <input
              type="text"
              className="input-field"
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="gift, fiesta, sonido"
              disabled={updating}
            />
          </div>

          <div className="form-group">
            <label>Descripcion</label>
            <textarea
              className="code-editor"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Explica cuando conviene usar esta accion"
              disabled={updating}
              style={{ minHeight: '90px' }}
            />
          </div>

          <div className="form-group">
            <label>Comando / Código *</label>
            <textarea
              className="code-editor"
              value={form.command}
              onChange={(e) => setForm((prev) => ({ ...prev, command: e.target.value }))}
              placeholder="Pega o edita el comando aquí. Se guardan saltos de línea."
              disabled={updating}
              style={{ minHeight: '170px', whiteSpace: 'pre' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Configuración de ejecución</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label className="toggle-container" style={{ margin: 0 }}>
                <span className="toggle-label">Queue</span>
                <input
                  type="checkbox"
                  checked={form.useQueue}
                  onChange={(e) => setForm((prev) => ({ ...prev, useQueue: e.target.checked }))}
                  disabled={updating}
                />
                <div className="toggle-switch">
                  <span className="toggle-slider"></span>
                </div>
              </label>

              <label className="toggle-container" style={{ margin: 0 }}>
                <span className="toggle-label">Combo</span>
                <input
                  type="checkbox"
                  checked={form.repeatPerUnit}
                  onChange={(e) => setForm((prev) => ({ ...prev, repeatPerUnit: e.target.checked }))}
                  disabled={updating}
                />
                <div className="toggle-switch">
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onClose}
              disabled={updating}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={updating}>
              <i className="fa-solid fa-save"></i> {updating ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GalleryEditModal
