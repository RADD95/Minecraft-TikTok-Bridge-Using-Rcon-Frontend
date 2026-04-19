// src/components/ConfigView.jsx - Vista para configurar la conexión RCON, ajustes de TikTok y variables del sistema
import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../api/client'

function ConfigView({ status, onRefreshStatus }) {
  const [config, setConfig] = useState({
    rcon: {
      host: '',
      port: 25575,
      password: ''
    },
    tiktok: {
      username: ''
    },
    minecraft: {
      playername: ''
    }
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
    const [quickCommand, setQuickCommand] = useState('')
  const [rconLoading, setRconLoading] = useState(false)
  const [tiktokStarting, setTiktokStarting] = useState(false)
  const [tiktokStopping, setTiktokStopping] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastSavedConfig, setLastSavedConfig] = useState(null)

  function isConnectedFlag(value) {
    if (typeof value === 'boolean') return value
    if (value && typeof value === 'object') {
      if (typeof value.connected === 'boolean') return value.connected
      if (typeof value.online === 'boolean') return value.online
      if (typeof value.active === 'boolean') return value.active
      if (typeof value.running === 'boolean') return value.running
    }
    return false
  }

const rconOnline =
  isConnectedFlag(status?.rcon) ||
  isConnectedFlag(status?.rconDetails)

const tiktokOnline =
  isConnectedFlag(status?.tiktok) ||
  isConnectedFlag(status?.tiktokDetails)

  const normalizedTikTokUsername = String(config?.tiktok?.username || '')
    .trim()
    .replace(/^@+/, '')

  const isDirty = useMemo(() => {
    if (!lastSavedConfig) return false
    return JSON.stringify(config) !== JSON.stringify(lastSavedConfig)
  }, [config, lastSavedConfig])

  function normalizeConfigResponse(data, preserveTikTokDraft = false) {
    const source = data?.effectiveConfig || data?.config || data || {}

    const backendUsername = String(source?.tiktok?.username || '').trim()
    const fallbackUsername = preserveTikTokDraft ? normalizedTikTokUsername : ''

    return {
      rcon: {
        host: String(source?.rcon?.host || ''),
        port: Number(source?.rcon?.port) || 25575,
        password: String(source?.rcon?.password || '')
      },
      tiktok: {
        username: backendUsername || fallbackUsername
      },
      minecraft: {
        playername: String(source?.minecraft?.playername || '')
      }
    }
  }

    async function sendQuickCommand() {
    if (!quickCommand.trim() || !rconOnline) return

    setError('')

    try {
      await apiPost('/api/rcon/command', {
        command: quickCommand.trim()
      })
      setQuickCommand('')
    } catch (err) {
      setError(err.message || 'No se pudo enviar el comando')
    }
  }

  async function loadConfig(options = {}) {
    const { silent = false, keepMessage = false, preserveTikTokDraft = false } = options

    if (!silent) {
      setLoading(true)
    }

    setError('')
    if (!keepMessage) {
      setMessage('')
    }

    try {
      const data = await apiGet('/api/config')
      const normalized = normalizeConfigResponse(data, preserveTikTokDraft)

      setConfig(normalized)
      setLastSavedConfig(normalized)
      return normalized
    } catch (err) {
      setError(err.message || 'No se pudo cargar la configuración')
      return null
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  function updateRcon(field, value) {
    setConfig((prev) => ({
      ...prev,
      rcon: {
        ...prev.rcon,
        [field]: value
      }
    }))
  }

  function updateTikTok(field, value) {
    setConfig((prev) => ({
      ...prev,
      tiktok: {
        ...prev.tiktok,
        [field]: value
      }
    }))
  }

  function updateMinecraft(field, value) {
    setConfig((prev) => ({
      ...prev,
      minecraft: {
        ...prev.minecraft,
        [field]: value
      }
    }))
  }

  async function saveFullConfig(showSuccessMessage = true) {
    setSaving(true)
    setError('')
    if (showSuccessMessage) {
      setMessage('')
    }

    try {
      const payload = {
        ...config,
        rcon: {
          ...config.rcon,
          port: Number(config.rcon.port) || 25575
        },
        tiktok: {
          ...config.tiktok,
          username: normalizedTikTokUsername
        },
        minecraft: {
          ...config.minecraft,
          playername: String(config.minecraft.playername || '').trim()
        }
      }

      const result = await apiPost('/api/config', payload)

      if (result?.success) {
        const normalizedSaved = normalizeConfigResponse(
          {
            config: result?.config || payload,
            effectiveConfig: result?.effectiveConfig || payload
          },
          true
        )

        setConfig(normalizedSaved)
        setLastSavedConfig(normalizedSaved)

        if (showSuccessMessage) {
          setMessage('Configuración guardada correctamente')
        }

        return true
      }

      setError(result?.error || 'No se pudo guardar')
      return false
    } catch (err) {
      setError(err.message || 'No se pudo guardar la configuración')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function connectRcon() {
    setMessage('Conectando RCON...')
    setError('')
    setRconLoading(true)

    const saved = await saveFullConfig(false)
    if (!saved) {
      setRconLoading(false)
      return
    }

    try {
      const result = await apiPost('/api/rcon/connect', {})

      if (result?.success) {
        setMessage('RCON conectado correctamente')
        if (typeof onRefreshStatus === 'function') {
          await onRefreshStatus()
        }
      } else {
        setError(result?.error || 'No se pudo conectar RCON')
        setMessage('')
      }
    } catch (err) {
      setError(err.message || 'No se pudo conectar RCON')
      setMessage('')
    } finally {
      setRconLoading(false)
    }
  }

  async function disconnectRcon() {
    setMessage('Desconectando RCON...')
    setError('')
    setRconLoading(true)

    try {
      const result = await apiPost('/api/rcon/disconnect', {})

      if (result?.success) {
        setMessage('RCON desconectado')
        if (typeof onRefreshStatus === 'function') {
          await onRefreshStatus()
        }
      } else {
        setError(result?.error || 'No se pudo desconectar RCON')
        setMessage('')
      }
    } catch (err) {
      setError(err.message || 'No se pudo desconectar RCON')
      setMessage('')
    } finally {
      setRconLoading(false)
    }
  }

  async function testRcon() {
    setMessage('Probando RCON...')
    setError('')

    try {
      const result = await apiPost('/api/rcon/test', {})

      if (result?.success) {
        setMessage(`Test OK: ${result.response || 'sin respuesta'}`)
      } else {
        setError(result?.error || 'Test fallido')
        setMessage('')
      }
    } catch (err) {
      setError(err.message || 'No se pudo probar RCON')
      setMessage('')
    }
  }

  async function startTikTok() {
    const username = normalizedTikTokUsername

    setError('')
    if (!username) {
      setMessage('')
      setError('Username requerido')
      return
    }

    setMessage(`Conectando a ${username}...`)
    setTiktokStarting(true)

    const saved = await saveFullConfig(false)
    if (!saved) {
      setTiktokStarting(false)
      return
    }

    try {
      const result = await apiPost('/api/tiktok/start', { username })

      if (result?.success) {
        setMessage(result?.message || `TikTok conectado a ${username}`)
        if (typeof onRefreshStatus === 'function') {
          await onRefreshStatus()
        }
      } else {
        setError(result?.error || 'No se pudo iniciar TikTok')
        setMessage('')
      }
    } catch (err) {
      setError(err.message || 'No se pudo iniciar TikTok')
      setMessage('')
    } finally {
      setTiktokStarting(false)
    }
  }

  async function stopTikTok() {
    setMessage('Deteniendo TikTok...')
    setError('')
    setTiktokStopping(true)

    try {
      const result = await apiPost('/api/tiktok/stop', {})

      if (result?.success) {
        setMessage(result?.message || 'TikTok detenido')
        if (typeof onRefreshStatus === 'function') {
          await onRefreshStatus()
        }
      } else {
        setError(result?.error || 'No se pudo detener TikTok')
        setMessage('')
      }
    } catch (err) {
      setError(err.message || 'No se pudo detener TikTok')
      setMessage('')
    } finally {
      setTiktokStopping(false)
    }
  }

  const disableStartButton =
    loading ||
    saving ||
    tiktokStarting ||
    tiktokStopping ||
    !normalizedTikTokUsername ||
    tiktokOnline

  const disableStopButton =
    loading ||
    saving ||
    tiktokStarting ||
    tiktokStopping ||
    !tiktokOnline

  if (loading) {
    return (
      <div className="view">
        <div className="header">
          <div>
            <h2>Configuración</h2>
            <p className="header-subtitle">Cargando configuración...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <div className="header">
        <div>
          <h2>Configuración</h2>
          <p className="header-subtitle">Ajustes globales y variables del sistema</p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => loadConfig({ keepMessage: true, preserveTikTokDraft: true })}
            disabled={saving || rconLoading || tiktokStarting || tiktokStopping}
          >
            <i className="fa-solid fa-rotate"></i> Recargar
          </button>

          <button
            className="btn btn-primary"
            onClick={() => saveFullConfig(true)}
            disabled={saving || rconLoading || tiktokStarting || tiktokStopping}
          >
            <i className="fa-solid fa-floppy-disk"></i>{' '}
            {saving ? 'Guardando...' : 'Guardar todo'}
          </button>
        </div>
      </div>

      {isDirty ? (
        <div className="hint-text" style={{ marginBottom: '1rem' }}>
          Tienes cambios sin guardar.
        </div>
      ) : null}

      {message ? <div className="success-box">{message}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <div className="dashboard-grid">
        <div className="card card-medium connection-card">
          <div className="card-header">
            <div className="card-title" style={{ color: 'var(--accent-tt)' }}>
              <i className="fa-brands fa-tiktok"></i> Conexión TikTok
            </div>

            <span className={`connection-status-badge ${tiktokOnline ? 'status-connected' : 'status-disconnected'}`}>
              <i className="fa-solid fa-circle"></i> {tiktokOnline ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          <div className="connection-input-group">
            <label>Usuario TikTok</label>
            <input
              type="text"
              className="input-field"
              placeholder="Escribe el usuario de TikTok para habilitar Iniciar"
              value={config.tiktok.username}
              onChange={(e) => updateTikTok('username', e.target.value)}
              disabled={tiktokStarting || tiktokStopping}
            />
            <p className="hint-text">
              Se guarda sin @. Valor actual: {normalizedTikTokUsername || 'vacío'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
            <button
              className="btn btn-success"
              style={{ flex: 1 }}
              onClick={startTikTok}
              disabled={disableStartButton}
            >
              <i className="fa-solid fa-play"></i>{' '}
              {tiktokStarting ? 'Conectando...' : 'Iniciar'}
            </button>

            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={stopTikTok}
              disabled={disableStopButton}
            >
              <i className="fa-solid fa-stop"></i>{' '}
              {tiktokStopping ? 'Deteniendo...' : 'Detener'}
            </button>
          </div>
        </div>

        <div className="card card-medium connection-card">
          <div className="card-header">
            <div className="card-title">
              <i className="fa-solid fa-cube"></i> Servidor Minecraft
            </div>

            <span className={`connection-status-badge ${rconOnline ? 'status-connected' : 'status-disconnected'}`}>
              <i className="fa-solid fa-circle"></i> {rconOnline ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          <div className="connection-input-group">
            <label>IP / Host</label>
            <input
              type="text"
              className="input-field"
              placeholder="127.0.0.1"
              value={config.rcon.host}
              onChange={(e) => updateRcon('host', e.target.value)}
              disabled={rconLoading}
            />
          </div>

          <div className="input-row" style={{ marginTop: '0.5rem' }}>
            <div className="connection-input-group">
              <label>Puerto</label>
              <input
                type="number"
                className="input-field"
                value={config.rcon.port}
                onChange={(e) => updateRcon('port', e.target.value)}
                disabled={rconLoading}
              />
            </div>

            <div className="connection-input-group" style={{ gridColumn: 'span 2' }}>
              <label>Contraseña</label>
              <input
                type="password"
                className="input-field"
                placeholder="RCON password"
                value={config.rcon.password}
                onChange={(e) => updateRcon('password', e.target.value)}
                disabled={rconLoading}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={connectRcon} disabled={saving || rconLoading || rconOnline}>
              <i className="fa-solid fa-plug"></i> {rconLoading ? 'Conectando...' : 'Conectar'}
            </button>

            <button className="btn btn-secondary" onClick={testRcon} disabled={saving || rconLoading}>
              <i className="fa-solid fa-flask"></i> Test
            </button>

            <button className="btn btn-secondary" onClick={disconnectRcon} disabled={saving || rconLoading || !rconOnline}>
              {rconLoading ? 'Procesando...' : 'Desconectar'}
            </button>
          </div>
        </div>

        <div className="card card-medium">
          <div className="card-header">
            <div className="card-title">
              <i className="fa-solid fa-user"></i> Jugador Minecraft
            </div>
          </div>

          <div className="connection-input-group">
            <label>Nombre del jugador target</label>
            <input
              type="text"
              className="input-field"
              placeholder="@a o nombre específico"
              value={config.minecraft.playername}
              onChange={(e) => updateMinecraft('playername', e.target.value)}
              disabled={saving}
            />
            <p className="hint-text">Usa @a para todos los jugadores o deja vacío</p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => saveFullConfig(true)}
            style={{ marginTop: '1rem', width: '100%' }}
            disabled={saving || rconLoading || tiktokStarting || tiktokStopping}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

        <div className="card card-medium">
          <div className="card-header">
            <div className="card-title">
              <i className="fa-solid fa-code"></i> Variables Disponibles
            </div>
          </div>

          <div className="variables-grid">
            <div className="variable-chip">{'{{username}}'}</div>
            <div className="variable-chip">{'{{nickname}}'}</div>
            <div className="variable-chip">{'{{giftname}}'}</div>
            <div className="variable-chip">{'{{diamondcount}}'}</div>
            <div className="variable-chip">{'{{repeatcount}}'}</div>
            <div className="variable-chip">{'{{likecount}}'}</div>
            <div className="variable-chip">{'{{comment}}'}</div>
            <div className="variable-chip">{'{{playername}}'}</div>
            <div className="variable-chip">{'{{totallikes}}'}</div>
            <div className="variable-chip">{'{{totalcomments}}'}</div>
            <div className="variable-chip">{'{{totalgifts}}'}</div>
            <div className="variable-chip">{'{{totaldiamonds}}'}</div>
          </div>
        </div>

                <div className="card card-small">
          <div className="card-header">
            <div className="card-title">
              <i className="fa-solid fa-rocket"></i>
              Test Rápido
            </div>
          </div>

          <div className="connection-input-group" style={{ marginBottom: '1rem' }}>
            <label>Comando</label>
            <input 
              type="text"
              className="input-field"
              placeholder="say Hello World"
              value={quickCommand}
              disabled
              onChange={(e) => setQuickCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendQuickCommand()
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={sendQuickCommand}
            disabled={!rconOnline || !quickCommand.trim()}
          >
            <i className="fa-solid fa-paper-plane"></i> Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfigView