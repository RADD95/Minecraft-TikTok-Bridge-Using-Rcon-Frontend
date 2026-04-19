import { useEffect, useMemo, useState } from 'react'

function normalizeOpacity(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 1
  if (n <= 1) return Math.max(0, Math.min(1, n))
  return Math.max(0, Math.min(1, n / 100))
}

function getOverlayHash(overlay) {
  if (!overlay || typeof overlay !== 'object') return ''

  return JSON.stringify({
    canvas: overlay.canvas || {},
    elements: Array.isArray(overlay.elements) ? overlay.elements : [],
    groups: Array.isArray(overlay.groups) ? overlay.groups : []
  })
}

async function fetchPublicOverlay(overlayId, withCacheBuster = false) {
  const query = withCacheBuster ? `?t=${Date.now()}` : ''
  const response = await fetch(`/api/public/overlays/${encodeURIComponent(overlayId)}${query}`)

  if (!response.ok) {
    throw new Error(`Overlay no encontrado (${response.status})`)
  }

  return response.json()
}

function OverlayPublicView({ overlayId }) {
  const [overlay, setOverlay] = useState(null)
  const [overlayHash, setOverlayHash] = useState('')
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function loadInitial() {
      try {
        setError('')
        const data = await fetchPublicOverlay(overlayId, false)
        if (!alive) return

        setOverlay(data)
        setOverlayHash(getOverlayHash(data))
      } catch (err) {
        if (!alive) return
        setError(err?.message || 'No se pudo cargar el overlay')
      }
    }

    loadInitial()

    return () => {
      alive = false
    }
  }, [overlayId])

  useEffect(() => {
    let alive = true

    const interval = window.setInterval(async () => {
      try {
        const data = await fetchPublicOverlay(overlayId, true)
        if (!alive) return

        const nextHash = getOverlayHash(data)
        if (nextHash !== overlayHash) {
          setOverlay(data)
          setOverlayHash(nextHash)
        }
      } catch {
        // Silencio intencional: evita ruido continuo mientras reconecta.
      }
    }, 2000)

    return () => {
      alive = false
      window.clearInterval(interval)
    }
  }, [overlayId, overlayHash])

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.classList.add('overlay-public-route')

    return () => {
      document.body.classList.remove('overlay-public-route')
    }
  }, [])

  const canvasWidth = Math.max(1, Number(overlay?.canvas?.width || 1080))
  const canvasHeight = Math.max(1, Number(overlay?.canvas?.height || 1920))
  const scale = Math.min(viewport.width / canvasWidth, viewport.height / canvasHeight)
  const offsetX = (viewport.width - canvasWidth * scale) / 2
  const offsetY = (viewport.height - canvasHeight * scale) / 2
  const canvasBackground = String(overlay?.canvas?.background || '').trim().toLowerCase()
  const publicCanvasBackground =
    !canvasBackground ||
      canvasBackground === 'transparent' ||
      canvasBackground === '#ffffff03'
      ? 'transparent'
      : overlay?.canvas?.background

  const elements = useMemo(() => {
    if (!Array.isArray(overlay?.elements)) return []
    return overlay.elements
      .slice()
      .filter((el) => !!el && !el.hidden)
      .sort((a, b) => Number(a?.zIndex || 0) - Number(b?.zIndex || 0))
  }, [overlay])

  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff6b6b',
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'transparent',
      position: 'relative'
    }}>
      {overlay ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            background: publicCanvasBackground,
            overflow: 'hidden'
          }}
        >
          {elements.map((element) => {
            const width = Math.max(1, Number(element.width || 20))
            const height = Math.max(1, Number(element.height || 20))
            const rotation = Number(element.rotation || 0)
            const animationName = element.animationBase || element.animation || ''
            const animationClass = animationName ? `anim-${animationName}` : ''
            const animationDuration = `${Math.max(0.1, Number(element.animationDurationSec ?? element.animationDuration ?? 3))}s`

            return (
              <div
                key={element.id || `${element.type}-${element.x}-${element.y}`}
                className="overlay-dom-node"
                style={{
                  left: `${Number(element.x || 0)}px`,
                  top: `${Number(element.y || 0)}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  opacity: normalizeOpacity(element.opacity),
                  zIndex: Number(element.zIndex || 1),
                  transform: `rotate(${rotation}deg)`
                }}
              >
                {element.type === 'text' ? (
                  <div
                    className={`overlay-node-text ${animationClass}`}
                    style={{
                      color: element.color || '#fff',
                      fontSize: `${Math.max(8, Number(element.fontSize || 32))}px`,
                      fontFamily: element.fontFamily || 'Inter, system-ui, sans-serif',
                      fontWeight: Number(element.fontWeight || 700),
                      textAlign: element.textAlign || 'left',
                      background: element.backgroundColor || 'transparent',
                      border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                      animationDuration
                    }}
                  >
                    {element.text || ''}
                  </div>
                ) : element.type === 'rect' ? (
                  <div
                    className={`overlay-node-rect ${animationClass}`}
                    style={{
                      background: element.backgroundColor || 'transparent',
                      border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                      animationDuration
                    }}
                  />
                ) : element.src ? (
                  <img
                    className={`overlay-node-media ${animationClass}`}
                    src={element.src}
                    alt={element.name || 'media'}
                    draggable={false}
                    style={{
                      objectFit: element.fit || 'contain',
                      border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                      background: element.backgroundColor || 'transparent',
                      animationDuration
                    }}
                  />
                ) : (
                  <div
                    className={`overlay-node-media ${animationClass}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `${Number(element.borderWidth || 0)}px solid ${element.borderColor || 'transparent'}`,
                      background: element.backgroundColor || 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.55)',
                      animationDuration,
                      fontSize: '12px',
                      textAlign: 'center',
                      padding: '8px'
                    }}
                  >
                    Sin imagen
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default OverlayPublicView
