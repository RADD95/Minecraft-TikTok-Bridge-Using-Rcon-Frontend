// src/App.jsx - Componente raíz de la aplicación React, maneja autenticación, navegación y estado global
import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPost, resolveBackendUrl } from './api/client'
import LoginForm from './components/LoginForm'
import Dashboard from './components/Dashboard'
import ConfigView from './components/ConfigView'
import ActionsView from './components/ActionsView'
import AdminUsersView from './components/AdminUsersView'
import OverlaysView from './components/OverlaysView'

function App() {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isLogged, setIsLogged] = useState(false)
  const [user, setUser] = useState(null)
  const [activeView, setActiveView] = useState('dashboard')
  const [globalStatus, setGlobalStatus] = useState({
    rcon: false,
    tiktok: false,
    queue: {
      pendingGroups: 0,
      pendingList: [],
      isProcessing: false,
      currentGroup: null,
      lastGroupFinishedAt: null
    }
  })
  const [globalStats, setGlobalStats] = useState({
    totalLikes: 0,
    totalComments: 0,
    totalGifts: 0,
    totalDiamonds: 0,
    totalFollows: 0,
    users: {}
  })
  const [globalLogs, setGlobalLogs] = useState([
    {
      id: 'boot-0',
      time: '--:--',
      ts: Date.now(),
      type: 'system',
      message: 'Sistema iniciado y listo...'
    }
  ])
  const [quickActionLoading, setQuickActionLoading] = useState({
    rcon: false,
    tiktok: false
  })

  const rconOnline =
    typeof globalStatus?.rcon === 'object'
      ? !!globalStatus?.rcon?.connected
      : !!globalStatus?.rcon

  const tiktokOnline =
    typeof globalStatus?.tiktok === 'object'
      ? !!globalStatus?.tiktok?.connected
      : !!globalStatus?.tiktok

  const isAdmin = user?.role === 'admin'

  async function checkAuth() {
    try {
      const data = await apiGet('/api/auth/me')

      if (data?.success) {
        setIsLogged(true)
        setUser(data.user || null)
      } else {
        setIsLogged(false)
        setUser(null)
      }
    } catch (err) {
      if (err.status === 401) {
        setIsLogged(false)
        setUser(null)
      }
    } finally {
      setCheckingAuth(false)
    }
  }

  async function handleLogout() {
    try {
      await apiPost('/api/auth/logout', {})
    } catch { }

    setIsLogged(false)
    setUser(null)
    setActiveView('dashboard')
    setGlobalStatus({
      rcon: false,
      tiktok: false,
      queue: {
        pendingGroups: 0,
        pendingList: [],
        isProcessing: false,
        currentGroup: null,
        lastGroupFinishedAt: null
      }
    })
    setGlobalStats({
      totalLikes: 0,
      totalComments: 0,
      totalGifts: 0,
      totalDiamonds: 0,
      totalFollows: 0,
      users: {}
    })
    setGlobalLogs([
      {
        id: 'boot-0',
        time: '--:--',
        ts: Date.now(),
        type: 'system',
        message: 'Sistema iniciado y listo...'
      }
    ])
  }

  function handleLogin(userData) {
    setIsLogged(true)
    setUser(userData || null)
  }

  async function refreshGlobalStatus() {
    try {
      const status = await apiGet('/api/status')
      setGlobalStatus((prev) => ({
        ...prev,
        ...status
      }))
    } catch (err) {
      console.error('Error refrescando estado global:', err)
    }
  }

  async function handleQuickRconToggle() {
    if (quickActionLoading.rcon) return

    setQuickActionLoading((prev) => ({ ...prev, rcon: true }))

    try {
      if (rconOnline) {
        await apiPost('/api/rcon/disconnect', {})
      } else {
        await apiPost('/api/rcon/connect', {})
      }

      await refreshGlobalStatus()
    } catch (err) {
      console.error('Error en acción rápida de RCON:', err)
    } finally {
      setQuickActionLoading((prev) => ({ ...prev, rcon: false }))
    }
  }

  async function handleQuickTikTokToggle() {
    if (quickActionLoading.tiktok) return

    setQuickActionLoading((prev) => ({ ...prev, tiktok: true }))

    try {
      if (tiktokOnline) {
        await apiPost('/api/tiktok/stop', {})
      } else {
        const data = await apiGet('/api/config')
        const source = data?.effectiveConfig || data?.config || data || {}
        const username = String(source?.tiktok?.username || '')
          .trim()
          .replace(/^@+/, '')

        if (!username) {
          alert('Configura primero el usuario de TikTok para poder iniciar la conexión.')
          setActiveView('config')
          return
        }

        await apiPost('/api/tiktok/start', { username })
      }

      await refreshGlobalStatus()
    } catch (err) {
      console.error('Error en acción rápida de TikTok:', err)
    } finally {
      setQuickActionLoading((prev) => ({ ...prev, tiktok: false }))
    }
  }

  const connectSSE = useCallback(() => {
    if (!isLogged) return null

    const eventSource = new EventSource(resolveBackendUrl('/api/logs/stream'), {
      withCredentials: true
    })

    eventSource.onopen = () => {
      console.log('SSE conectado')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('SSE message:', event.type, data)
      } catch (err) {
        console.error('Error parseando SSE:', event.data)
      }
    }

    eventSource.addEventListener('log', (event) => {
      try {
        const log = JSON.parse(event.data)

        setGlobalLogs((prev) => {
          const newLog = {
            id: log?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            time: log?.time || '--:--',
            ts: log?.ts || Date.now(),
            type: log?.type || 'system',
            message: log?.message || ''
          }

          return [newLog, ...prev].slice(0, 200)
        })

        console.log('SSE event: log', log)
      } catch (err) {
        console.error('Error SSE log:', event.data)
      }
    })

    eventSource.addEventListener('logsinit', (event) => {
      try {
        const initialLogs = JSON.parse(event.data)
        const normalized = Array.isArray(initialLogs)
          ? [...initialLogs]
            .slice(-100)
            .reverse()
            .map((log, index) => ({
              id: log?.id || `init-${index}-${Date.now()}`,
              time: log?.time || '--:--',
              ts: log?.ts || Date.now(),
              type: log?.type || 'system',
              message: log?.message || ''
            }))
          : []

        setGlobalLogs(
          normalized.length
            ? normalized
            : [
              {
                id: 'boot-0',
                time: '--:--',
                ts: Date.now(),
                type: 'system',
                message: 'Sin eventos todavía'
              }
            ]
        )
      } catch (err) {
        console.error('Error SSE logsinit:', event.data)
      }
    })

    eventSource.addEventListener('logscleared', (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data?.success) {
          setGlobalLogs([])
        }
      } catch (err) {
        console.error('Error SSE logscleared:', event.data)
      }
    })

    eventSource.addEventListener('statsupdate', (event) => {
      try {
        const stats = JSON.parse(event.data)
        setGlobalStats((prev) => ({
          ...prev,
          ...stats
        }))
      } catch (err) {
        console.error('Error SSE statsupdate:', event.data)
      }
    })

    eventSource.addEventListener('statusupdate', (event) => {
      try {
        const status = JSON.parse(event.data)
        setGlobalStatus((prev) => ({
          ...prev,
          ...status
        }))
      } catch (err) {
        console.error('Error SSE statusupdate:', event.data)
      }
    })

    eventSource.addEventListener('queueupdate', (event) => {
      try {
        const queue = JSON.parse(event.data)
        setGlobalStatus((prev) => ({ ...prev, queue }))
      } catch (err) {
        console.error('Error SSE queueupdate:', event.data)
      }
    })

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
    }

    return () => {
      eventSource.close()
      console.log('SSE desconectado')
    }
  }, [isLogged])


  useEffect(() => {
    const onKeyDown = (event) => {
      const isZoomShortcut =
        (event.ctrlKey || event.metaKey) &&
        (event.key === '+' ||
          event.key === '-' ||
          event.key === '=' ||
          event.key === '0')

      if (isZoomShortcut) {
        event.preventDefault()
      }
    }

    const onWheel = (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    let cleanup

    if (isLogged) {
      cleanup = connectSSE()
    }

    return cleanup
  }, [isLogged, connectSSE])

  if (checkingAuth) {
    return (
      <div className="screen center">
        <div className="card login-card">
          <h1>Cargando...</h1>
          <p>Comprobando sesión</p>
        </div>
      </div>
    )
  }

  if (!isLogged) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <i className="fa-solid fa-gamepad"></i>
          </div>

          <div className="brand-text">
            <h1>MC-TT Bridge</h1>
            <span>{user?.username || 'Control Center'}</span>
          </div>
        </div>

        <nav>
          <div className="nav-section">
            <div className="nav-label">Principal</div>

            <button
              className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              <i className="fa-solid fa-chart-line"></i>
              <span>Dashboard</span>
            </button>

            <button
              className={`nav-item ${activeView === 'config' ? 'active' : ''}`}
              onClick={() => setActiveView('config')}
            >
              <i className="fa-solid fa-sliders"></i>
              <span>Configuración</span>
            </button>

            <button
              className={`nav-item ${activeView === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveView('actions')}
            >
              <i className="fa-solid fa-bolt"></i>
              <span>Acciones</span>
            </button>

            <button
              className={`nav-item ${activeView === 'overlays' ? 'active' : ''}`}
              onClick={() => setActiveView('overlays')}
            >
              <i className="fa-solid fa-layer-group"></i>
              <span>Overlays</span>
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-label">Herramientas</div>

            {isAdmin ? (
              <button
                className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
                onClick={() => setActiveView('users')}
              >
                <i className="fa-solid fa-users"></i>
                <span>Usuarios</span>
              </button>
            ) : null}
          </div>
        </nav>

        <div className="connection-status">
          <div className="status-header">
            <span className="status-title">Estado Global</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <i
                  className="fa-solid fa-cube"
                  style={{ color: 'var(--accent-mc)', marginRight: '0.5rem' }}
                ></i>
                Minecraft
              </span>

              <span className={`status-indicator ${rconOnline ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                <span>{rconOnline ? 'Online' : 'Offline'}</span>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <i
                  className="fa-brands fa-tiktok"
                  style={{ color: 'var(--accent-tt)', marginRight: '0.5rem' }}
                ></i>
                TikTok
              </span>

              <span className={`status-indicator ${tiktokOnline ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                <span>{tiktokOnline ? 'Online' : 'Offline'}</span>
              </span>
            </div>

            {globalStatus.queue && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-list" style={{ marginRight: '0.5rem' }}></i>
                  Cola
                </span>

                <span
                  className={`status-indicator ${globalStatus.queue.isProcessing
                      ? 'processing'
                      : globalStatus.queue.pendingGroups > 0
                        ? 'pending'
                        : 'idle'
                    }`}
                >
                  <span className="status-dot"></span>
                  <span>
                    {globalStatus.queue.isProcessing
                      ? 'Procesando'
                      : globalStatus.queue.pendingGroups > 0
                        ? `${globalStatus.queue.pendingGroups} pend.`
                        : 'Vacía'}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="global-toolbar">
          <div className="global-toolbar-left">
            <span className="toolbar-label">Conexiones rápidas:</span>

            <button
              className={`btn ${rconOnline ? 'btn-success' : 'btn-secondary'} toolbar-btn`}
              onClick={handleQuickRconToggle}
              disabled={quickActionLoading.rcon || quickActionLoading.tiktok}
            >
              <i className="fa-solid fa-cube"></i>{' '}
              {quickActionLoading.rcon
                ? rconOnline
                  ? 'Desconectando RCON...'
                  : 'Conectando RCON...'
                : `RCON ${rconOnline ? 'Online' : 'Offline'}`}
            </button>

            <button
              className={`btn ${tiktokOnline ? 'btn-success' : 'btn-secondary'} toolbar-btn`}
              onClick={handleQuickTikTokToggle}
              disabled={quickActionLoading.rcon || quickActionLoading.tiktok}
            >
              <i className="fa-brands fa-tiktok"></i>{' '}
              {quickActionLoading.tiktok
                ? tiktokOnline
                  ? 'Deteniendo TikTok...'
                  : 'Iniciando TikTok...'
                : `TikTok ${tiktokOnline ? 'Online' : 'Offline'}`}
            </button>
          </div>

          <div className="global-toolbar-right">
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-rotate"></i>
            </button>

            <button className="btn btn-danger" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> Salir
            </button>
          </div>
        </div>

        {activeView === 'dashboard' ? (
          <Dashboard
            user={user}
            status={globalStatus}
            stats={globalStats}
            logs={globalLogs}
            onRefresh={() => window.location.reload()}
            onLogout={handleLogout}
            onClearLogs={() => setGlobalLogs([])}
          />
        ) : null}

        {activeView === 'config' ? (
          <ConfigView
            status={globalStatus}
            onRefreshStatus={async () => {
              try {
                const status = await apiGet('/api/status')
                setGlobalStatus((prev) => ({
                  ...prev,
                  ...status
                }))
              } catch (err) {
                console.error('Error refrescando status:', err)
              }
            }}
          />
        ) : null}

        {activeView === 'actions' ? <ActionsView /> : null}

        {activeView === 'overlays' ? <OverlaysView /> : null}

        {activeView === 'users' && isAdmin ? (
          <AdminUsersView currentUser={user} />
        ) : null}
      </main>
    </div>
  )
}

export default App