// src/components/LoginForm.jsx - Componente de formulario de inicio de sesión para la aplicación React del dashboard
import { useState } from 'react'
import { apiPost } from '../api/client'

function LoginForm({ onLogin }) {
  const [form, setForm] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.username.trim() || !form.password.trim()) {
      setError('Escribe usuario y contraseña')
      return
    }

    setLoading(true)

    try {
      const data = await apiPost('/api/auth/login', {
        username: form.username,
        password: form.password
      })

      if (data?.success) {
        onLogin(data.user || null)
      } else {
        setError(data?.error || 'No se pudo iniciar sesión')
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen center login-bg">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Minecraft TikTok Bridge</h1>
        <p>Frontend separado con React</p>

        <label htmlFor="username">Usuario</label>
        <input
        className="input-field"
          id="username"
          type="text"
          placeholder="admin"
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
        />

        <label htmlFor="password">Contraseña</label>
        <input
        className="input-field"
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
        />

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default LoginForm