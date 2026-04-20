import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client'
import { fireSwal } from '../utils/swal'

function AdminUsersView({ currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'user',
    useGlobalRcon: false,
    useGlobalTikTok: false
  })

  const isAdmin = currentUser?.role === 'admin'

  function resetForm() {
    setEditingUser(null)
    setForm({
      username: '',
      password: '',
      role: 'user',
      useGlobalRcon: false,
      useGlobalTikTok: false
    })
  }

  function openCreate() {
    setError('')
    setSuccess('')
    resetForm()
    setShowCreate(true)
  }

    function openEdit(user) {
    setError('')
    setSuccess('')
    setEditingUser(user)
    setForm({
      username: user?.username || '',
      password: '',
      role: user?.role || 'user',
      useGlobalRcon: !!user?.settings?.useGlobalRcon,
      useGlobalTikTok: !!user?.settings?.useGlobalTikTok
    })
    setShowCreate(true)
  }

  function closeCreate() {
    setShowCreate(false)
    resetForm()
  }

  function handleFormChange(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')

      const data = await apiGet('/api/admin/users')

      if (!data?.success) {
        throw new Error(data?.error || 'No se pudieron cargar los usuarios')
      }

      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (err) {
      setError(err.message || 'Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = {
        username: form.username,
        password: form.password,
        role: form.role,
        useGlobalRcon: !!form.useGlobalRcon,
        useGlobalTikTok: !!form.useGlobalTikTok
      }

      const data = await apiPost('/api/admin/users', payload)

      if (!data?.success) {
        throw new Error(data?.error || 'No se pudo crear el usuario')
      }

      await loadUsers()
      closeCreate()
      setSuccess('Usuario creado correctamente')
    } catch (err) {
      setError(err.message || 'Error creando usuario')
    } finally {
      setSaving(false)
    }
  }

    async function handleUpdateUser(e) {
    e.preventDefault()

    if (!editingUser?.id) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = {
        username: form.username,
        role: form.role,
        isActive: !!editingUser?.isActive,
        useGlobalRcon: !!form.useGlobalRcon,
        useGlobalTikTok: !!form.useGlobalTikTok
      }

      if (form.password?.trim()) {
        payload.password = form.password
      }

      const data = await apiPatch(`/api/admin/users/${editingUser.id}`, payload)

      if (!data?.success) {
        throw new Error(data?.error || 'No se pudo actualizar el usuario')
      }

      await loadUsers()
      closeCreate()
      setSuccess('Usuario actualizado correctamente')
    } catch (err) {
      setError(err.message || 'Error actualizando usuario')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(user) {
    const result = await fireSwal({
      icon: 'warning',
      title: 'Eliminar usuario',
      text: `¿Seguro que quieres borrar al usuario "${user?.username}"?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const data = await apiDelete(`/api/admin/users/${user.id}`)

      if (!data?.success) {
        throw new Error(data?.error || 'No se pudo borrar el usuario')
      }

      await loadUsers()
      setSuccess('Usuario borrado correctamente')
    } catch (err) {
      setError(err.message || 'Error borrando usuario')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <section className="card">
        <h2>Usuarios</h2>
        <p>No tienes permisos para ver este módulo.</p>
      </section>
    )
  }

  return (
    <section className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h2 style={{ marginBottom: '0.35rem' }}>Usuarios</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Lista de usuarios del sistema.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={openCreate} disabled={saving}>
            <i className="fa-solid fa-user-plus"></i> Crear usuario
          </button>

          <button
            className="btn btn-secondary"
            onClick={loadUsers}
            disabled={loading || saving}
          >
            <i className="fa-solid fa-rotate"></i> Recargar
          </button>
        </div>
      </div>

      {error ? (
        <div className="status-card danger" style={{ marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {success ? (
        <div className="status-card success" style={{ marginBottom: '1rem' }}>
          <strong>OK:</strong> {success}
        </div>
      ) : null}

      {loading ? (
        <p>Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Usuario</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Rol</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Activo</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Global RCON</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Global TikTok</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td
                    style={{
                      padding: '0.75rem',
                      borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                    }}
                  >
                    {item.id}
                  </td>

                  <td
                    style={{
                      padding: '0.75rem',
                      borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                    }}
                  >
                    {item.username}
                  </td>

                  <td
                    style={{
                      padding: '0.75rem',
                      borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                    }}
                  >
                    {item.role}
                  </td>

                  <td
                    style={{
                      padding: '0.75rem',
                      borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                    }}
                  >
                    {item.isActive ? 'Sí' : 'No'}
                  </td>

                  <td
                    style={{
                      padding: '0.75rem',
                      borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                    }}
                  >
                    {item?.settings?.useGlobalRcon ? 'Sí' : 'No'}
                  </td>

                  <td
                    style={{
                      padding: '0.75rem',
                      borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                    }}
                  >
                    {item?.settings?.useGlobalTikTok ? 'Sí' : 'No'}
                  </td>
                                    <td
                    style={{
                      padding: '0.75rem',
                      borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openEdit(item)}
                        disabled={saving}
                      >
                        <i className="fa-solid fa-pen"></i> Editar
                      </button>

                      {Number(item.id) !== Number(currentUser?.id) ? (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteUser(item)}
                          disabled={saving}
                        >
                          <i className="fa-solid fa-trash"></i> Borrar
                        </button>
                      ) : (
                        <button className="btn btn-secondary" disabled>
                          <i className="fa-solid fa-lock"></i> Tu cuenta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate ? (
        <div
          onClick={closeCreate}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 999
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}
            >
              <h3 style={{ margin: 0 }}>
                {editingUser ? `Editar usuario #${editingUser.id}` : 'Crear usuario'}
              </h3>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeCreate}
                disabled={saving}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span>Username</span>
                  <input
                    className="input-field"
                    type="text"
                    value={form.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                    placeholder="nuevo_usuario"
                    required
                  />
                </label>

                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span>{editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}</span>
                  <input
                    className="input-field"
                    type="password"
                    value={form.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    placeholder={
                      editingUser
                        ? 'deja vacío para no cambiarla'
                        : 'mínimo 4 caracteres'
                    }
                    required={!editingUser}
                  />
                </label>

                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span>Rol</span>
                  <select
                  className="input-field"
                    value={form.role}
                    onChange={(e) => handleFormChange('role', e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="checkbox"
                    checked={!!form.useGlobalRcon}
                    onChange={(e) => handleFormChange('useGlobalRcon', e.target.checked)}
                  />
                  <span>Usar RCON global del admin</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="checkbox"
                    checked={!!form.useGlobalTikTok}
                    onChange={(e) => handleFormChange('useGlobalTikTok', e.target.checked)}
                  />
                  <span>Usar TikTok global del admin</span>
                </label>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    marginTop: '0.5rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeCreate}
                    disabled={saving}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="fa-solid fa-floppy-disk"></i>{' '}
                    {saving
                      ? 'Guardando...'
                      : editingUser
                        ? 'Guardar cambios'
                        : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AdminUsersView