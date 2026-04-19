function uid(prefix = 'el') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n))
}

function normalizeNumber(value, fallback = 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function isGifUrl(url = '') {
    return /\.gif($|\?)/i.test(url)
}

function reorderByMove(arr, from, to) {
    const next = [...arr]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
}

function normalizeOverlay(raw, fallbackId = '') {
    const elements = Array.isArray(raw?.elements) ? raw.elements : []
    const normalizedElements = elements.map((item, index) => ({
        id: item?.id || uid('el'),
        type: item?.type || (item?.src ? 'image' : 'rect'),
        name: item?.name || item?.text || item?.displayName || `Elemento ${index + 1}`,
        x: normalizeNumber(item?.x, 80),
        y: normalizeNumber(item?.y, 80),
        width: normalizeNumber(item?.width, item?.type === 'text' ? 260 : 220),
        height: normalizeNumber(item?.height, item?.type === 'text' ? 72 : 140),
        rotation: normalizeNumber(item?.rotation ?? item?.rotate, 0),
        opacity:
            item?.opacity == null
                ? 1
                : Number(item.opacity) > 1
                    ? Number(item.opacity) / 100
                    : Number(item.opacity),
        zIndex: normalizeNumber(item?.zIndex, index + 1),
        text: item?.text || 'Nuevo texto',
        fontSize: normalizeNumber(item?.fontSize, 32),
        fontFamily: item?.fontFamily || 'Inter, system-ui, sans-serif',
        fontWeight: normalizeNumber(item?.fontWeight, 700),
        color: item?.color || item?.textColor || '#ffffff',
        textAlign: item?.textAlign || item?.align || 'left',
        src: item?.src || '',
        fit: item?.fit || 'contain',
        backgroundColor: item?.backgroundColor || 'rgba(0,0,0,0)',
        borderColor: item?.borderColor || 'rgba(255,255,255,0.65)',
        borderWidth: normalizeNumber(item?.borderWidth, item?.type === 'rect' ? 1 : 0),
        animation: item?.animation || item?.animationBase || '',
        animationDuration: normalizeNumber(item?.animationDuration ?? item?.animationDurationSec, 3),
        trigger: item?.trigger || '',
        hidden: !!item?.hidden
    }))

    return {
        id: raw?.id || fallbackId,
        name: raw?.name || 'Sin nombre',
        canvas: {
            width: normalizeNumber(raw?.canvas?.width, 1080),
            height: normalizeNumber(raw?.canvas?.height, 1920),
            background: '#ffffff03'
        },
        elements: normalizedElements,
        groups: Array.isArray(raw?.groups) ? raw.groups : [],
        preview: raw?.preview || ''
    }
}

function createTextElement() {
    return {
        id: uid('el'),
        type: 'text',
        name: 'Texto',
        text: 'Nuevo texto',
        x: 120,
        y: 120,
        width: 320,
        height: 84,
        rotation: 0,
        opacity: 1,
        zIndex: Date.now(),
        fontSize: 42,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700,
        color: '#ffffff',
        textAlign: 'left',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(255,255,255,0)',
        borderWidth: 0,
        animation: '',
        animationDuration: 3,
        trigger: '',
        hidden: false
    }
}

function createRectElement() {
    return {
        id: uid('el'),
        type: 'rect',
        name: 'Rectángulo',
        x: 160,
        y: 160,
        width: 300,
        height: 160,
        rotation: 0,
        opacity: 1,
        zIndex: Date.now(),
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        animation: '',
        animationDuration: 3,
        trigger: '',
        hidden: false
    }
}

function createImageElement(src, name = 'Imagen', type = 'image') {
    return {
        id: uid('el'),
        type,
        name,
        src,
        x: 180,
        y: 180,
        width: 220,
        height: 220,
        rotation: 0,
        opacity: 1,
        zIndex: Date.now(),
        fit: 'contain',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(255,255,255,0)',
        borderWidth: 0,
        animation: '',
        animationDuration: 3,
        trigger: '',
        hidden: false
    }
}

function getCanvasPresetValue(canvas) {
    const value = `${canvas.width}x${canvas.height}`
    if (['1080x1920', '1920x1080', '1080x1080'].includes(value)) return value
    return '1080x1920'
}

function normalizeLibraryItemName(item, index, kind) {
    if (kind === 'gift') {
        return (
            item?.name_en ||
            item?.nameen ||
            item?.name ||
            item?.title ||
            item?.displayName ||
            `Gift ${index + 1}`
        )
    }

    return item?.displayName || item?.name || `Render ${index + 1}`
}

function normalizeLibraryItemImage(item) {
    return (
        item?.image_url ||
        item?.imageurl ||
        item?.imageUrl ||
        item?.image ||
        item?.icon ||
        item?.picture ||
        item?.thumbnail ||
        item?.url ||
        item?.src ||
        null
    )
}

function normalizeLibraryList(items, kind) {
    return items
        .map((item, index) => {
            const name = normalizeLibraryItemName(item, index, kind)
            const image = normalizeLibraryItemImage(item)

            return {
                ...item,
                __name: String(name),
                __image: image,
                __subtitle: kind === 'gift' ? (item?.diamonds != null ? `${item.diamonds} diamantes` : 'TikTok') : 'Minecraft'
            }
        })
        .filter((item) => item.__image)
}

export {
    clamp,
    createImageElement,
    createRectElement,
    createTextElement,
    getCanvasPresetValue,
    isGifUrl,
    normalizeLibraryList,
    normalizeNumber,
    normalizeOverlay,
    reorderByMove,
    uid
}
