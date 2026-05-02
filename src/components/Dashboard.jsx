import { useEffect, useRef, useState } from 'react'
import { apiPost } from '../api/client'
import { fireSwal } from '../utils/swal'

function Dashboard({
  user,
  status,
  stats = {},
  logs = [],
  onRefresh,
  onLogout,
  onClearLogs,
  onStatsReset
}) {
  const [error, setError] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [resettingStats, setResettingStats] = useState(false)
  const [clearingLogs, setClearingLogs] = useState(false)

  const consoleRef = useRef(null)

  const rconOnline =
    typeof status?.rcon === 'object'
      ? !!status?.rcon?.connected
      : !!status?.rcon

  const visibleLogs = Array.isArray(logs) ? logs : []
  const orderedLogs = [...visibleLogs].reverse()
  const queuePendingList = Array.isArray(status?.queue?.pendingList)
    ? status.queue.pendingList
    : []

  useEffect(() => {
    if (!autoScroll) return
    if (!consoleRef.current) return

    consoleRef.current.scrollTo({
      top: consoleRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [orderedLogs, autoScroll])



  async function handleResetStats() {
    if (resettingStats) return

    const result = await fireSwal({
      icon: 'warning',
      title: 'Resetear estadísticas',
      text: '¿Seguro que quieres resetear las estadísticas de esta sesión?',
      showCancelButton: true,
      confirmButtonText: 'Resetear',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    setError('')
    setResettingStats(true)

    try {
      const result = await apiPost('/api/stats/reset', {})

      if (typeof onStatsReset === 'function') {
        onStatsReset(
          result?.stats || {
            totalLikes: 0,
            totalComments: 0,
            totalGifts: 0,
            totalDiamonds: 0,
            totalFollows: 0,
            users: {}
          }
        )
      }

      if (typeof onRefresh === 'function') {
        await onRefresh()
      }
    } catch (err) {
      setError(err.message || 'No se pudieron resetear las estadísticas')
    } finally {
      setResettingStats(false)
    }
  }

  async function clearLogs() {
    if (clearingLogs) return

    const result = await fireSwal({
      icon: 'warning',
      title: 'Limpiar consola',
      text: '¿Seguro que quieres limpiar la consola visible de esta sesión?',
      showCancelButton: true,
      confirmButtonText: 'Limpiar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    setClearingLogs(true)
    setError('')

    try {
      if (typeof onClearLogs === 'function') {
        await onClearLogs()
      }
    } catch (err) {
      setError(err.message || 'No se pudieron limpiar los logs')
    } finally {
      setClearingLogs(false)
    }
  }

  function toggleAutoScroll() {
    setAutoScroll((prev) => !prev)
  }

  function scrollToBottom() {
    if (!consoleRef.current) return

    consoleRef.current.scrollTo({
      top: consoleRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }

  return (
    <div className="view">

      {error ? <div className="error-box">{error}</div> : null}

      <div className="dashboard-grid">
        <div className="card card-full">
          <div className="card-header">
            <div className="card-title">
              <i className="fa-solid fa-chart-pie"></i>
              Estadísticas de Sesión
            </div>

            <button
              className="btn btn-secondary"
              onClick={handleResetStats}
              disabled={resettingStats}
            >
              {resettingStats ? 'Reseteando...' : 'Resetear'}
            </button>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-value">{stats?.totalLikes ?? 0}</div>
              <div className="stat-label">Likes</div>
            </div>

            <div className="stat-item">
              <div className="stat-value">{stats?.totalComments ?? 0}</div>
              <div className="stat-label">Comentarios</div>
            </div>

            <div className="stat-item mc">
              <div className="stat-value">{stats?.totalGifts ?? 0}</div>
              <div className="stat-label">Regalos</div>
            </div>

            <div className="stat-item mc">
              <div className="stat-value">{stats?.totalDiamonds ?? 0}</div>
              <div className="stat-label">Diamantes</div>
            </div>

            <div className="stat-item">
              <div className="stat-value">{stats?.totalFollows ?? 0}</div>
              <div className="stat-label">Seguidores</div>
            </div>
          </div>
        </div>


        <div className="card card-console">
          <div className="card-header">
            <div className="card-title">
              <i className="fa-solid fa-terminal"></i>
              Consola de Eventos
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={onRefresh}>
                <i className="fa-solid fa-rotate"></i>
              </button>

              <button
                className="btn btn-secondary"
                onClick={clearLogs}
                disabled={clearingLogs}
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

              <div
                ref={consoleRef}
                className="console"
              >
            {orderedLogs.length === 0 ? (
              <div className="log-entry">
                <span className="log-time">--:--</span>
                <span className="log-type system">SYSTEM</span>
                <span className="log-message">Sin eventos todavía</span>
              </div>
            ) : (
              orderedLogs.map((log, index) => (
                <div className="log-entry" key={log.id || `${log.time}-${index}`}>
                  <span className="log-time">{log.time || '--:--'}</span>
                  <span className={`log-type ${log.type || 'system'}`}>
                    {(log.type || 'system').toUpperCase()}
                  </span>
                  <span className="log-message">{log.message || ''}</span>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: '1rem',
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <label style={{ fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={toggleAutoScroll}
              />{' '}
              Auto-scroll
            </label>

            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem' }}
              onClick={scrollToBottom}
            >
              <i className="fa-solid fa-arrow-down"></i>
            </button>
          </div>
        </div>

        
          {status?.queue && (
            <div className="card card-queue">
              <div className="card-header card-queue-header">
                <div className="card-title">
                  <i className="fa-solid fa-list"></i>
                  Cola de Comandos
                </div>

                <div className="queue-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => apiPost('/api/queue/retry', {})}
                    disabled={!status.queue.pendingGroups}
                  >
                    Reintentar
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => apiPost('/api/queue/clear', {})}
                    disabled={!status.queue.pendingGroups}
                  >
                    Vaciar
                  </button>
                </div>
              </div>

              <div className="queue-body">
                <div className="queue-summary">
                  <span>Total en cola: {status.queue.pendingGroups ?? 0}</span>

                  <span
                    className={`status-indicator ${
                      status.queue.isProcessing
                        ? 'processing'
                        : status.queue.pendingGroups > 0
                          ? 'pending'
                          : 'idle'
                    }`}
                  >
                    {status.queue.isProcessing
                      ? 'Procesando'
                      : status.queue.pendingGroups > 0
                        ? 'Pendiente'
                        : 'Vacía'}
                  </span>
                </div>

                {status.queue.currentGroup ? (
                  <div className="queue-current queue-current-active">
                    <div className="queue-current-label">
                      Ejecutando ahora
                    </div>

                    <div className="queue-current-title">
                      {status.queue.currentGroup.source}
                    </div>

                    <div className="queue-current-meta">
                      {status.queue.currentGroup.totalCommands ?? 0} comando(s)
                    </div>
                  </div>
                ) : (
                  <div className="queue-empty-box">
                    No hay grupo ejecutándose ahora mismo
                  </div>
                )}

                <div className="queue-section-label">
                  Siguiente en cola
                </div>

                <div className="queue-list">
                  {queuePendingList.length === 0 ? (
                    <div className="queue-empty-box">
                      Sin elementos pendientes
                    </div>
                  ) : (
                    queuePendingList.map((item) => (
                      <div
                        key={`${item.position}-${item.source}-${item.createdAt || 'na'}`}
                        className="queue-item"
                      >
                        <div className="queue-item-title">
                          #{item.position} · {item.source}
                        </div>

                        <div className="queue-item-meta">
                          {item.totalCommands ?? 0} comando(s)
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

      </div>
    </div>
  )
}

export default Dashboard