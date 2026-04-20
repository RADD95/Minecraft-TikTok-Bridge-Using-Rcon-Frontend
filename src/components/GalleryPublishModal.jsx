import { useEffect, useState } from 'react'

const defaultPublishState = {
  actionIndex: '',
  actionName: '',
  title: '',
  description: '',
  minecraftVersion: '',
  tags: ''
}

function GalleryPublishModal({ open, myActions, items = [], onClose, onPublish }) {
  const [form, setForm] = useState(defaultPublishState)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(defaultPublishState)
      setError('')
    }
  }, [open])

  if (!open) return null

  const selectedAction = form.actionIndex
    ? myActions[Number.parseInt(form.actionIndex, 10)]
    : null

  const actionHasName = selectedAction && selectedAction.name && selectedAction.name.trim()
  const finalActionName = actionHasName ? selectedAction.name : form.actionName

  async function handleSubmit(event) {
    event.preventDefault()

    if (!selectedAction) {
      setError('Selecciona una accion para publicar')
      return
    }

    if (!actionHasName && !form.actionName.trim()) {
      setError('Esta accion no tiene nombre. Por favor proporciona un nombre')
      return
    }

    if (!form.title.trim()) {
      setError('El titulo es requerido')
      return
    }

    if (!form.minecraftVersion.trim()) {
      setError('Version de Minecraft es requerida')
      return
    }

    const versionRegex = /^[\d.]+$/
    if (!versionRegex.test(form.minecraftVersion.trim())) {
      setError('Version invalida. Solo numeros y puntos (ej: 1.20, 1.20.1)')
      return
    }

    // Validar que no exista una acción con los mismos comandos
    const selectedCommandNormalized = String(selectedAction.command || '')
      .trim()
      .toLowerCase()
    
    const isDuplicate = items.some((item) => {
      const itemCommandNormalized = String(item.command || '')
        .trim()
        .toLowerCase()
      return itemCommandNormalized === selectedCommandNormalized
    })

    if (isDuplicate) {
      setError('Esta accion con los mismos comandos ya ha sido publicada. Modifica los comandos si deseas publicarla nuevamente.')
      return
    }

    setPublishing(true)

    try {
      await onPublish({
        title: form.title.trim(),
        description: form.description.trim(),
        minecraftVersion: form.minecraftVersion.trim(),
        tags: form.tags,
        action: {
          ...selectedAction,
          name: finalActionName.trim()
        }
      })

      setForm(defaultPublishState)
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo publicar la accion')
    } finally {
      setPublishing(false)
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
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Publicar Accion en Galeria</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Comparte tu accion con la comunidad
          </p>
        </div>

        {error ? <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Accion *</label>
            <select
              className="input-field"
              value={form.actionIndex}
              onChange={(e) => setForm((prev) => ({ ...prev, actionIndex: e.target.value, actionName: '' }))}
              disabled={publishing}
            >
              <option value="">Selecciona una accion...</option>
              {myActions.map((action, index) => (
                <option key={`my-action-${index}`} value={index}>
                  {action.name || `Accion ${index + 1}`} - {action.type} - {action.trigger || 'sin trigger'}
                </option>
              ))}
            </select>
          </div>

          {selectedAction && !actionHasName ? (
            <div className="form-group">
              <label>Nombre de la accion *</label>
              <input
                type="text"
                className="input-field"
                value={form.actionName}
                onChange={(e) => setForm((prev) => ({ ...prev, actionName: e.target.value }))}
                placeholder="Ej: Efecto especial, Sonido de celebracion"
                disabled={publishing}
              />
            </div>
          ) : null}

          <div className="input-row">
            <div className="form-group">
              <label>Titulo publico *</label>
              <input
                type="text"
                className="input-field"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Celebracion Finger Heart"
                disabled={publishing}
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
                disabled={publishing}
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
              disabled={publishing}
            />
          </div>

          <div className="form-group">
            <label>Descripcion</label>
            <textarea
              className="code-editor"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Explica cuando conviene usar esta accion"
              disabled={publishing}
              style={{ minHeight: '90px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onClose}
              disabled={publishing}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={publishing}>
              <i className="fa-solid fa-store"></i> {publishing ? 'Publicando...' : 'Publicar en galeria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GalleryPublishModal
