import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, resolveBackendUrl } from '../api/client'
import { normalizeLibraryList } from './overlayEditorUtils'

const BROKEN_IMAGE_CACHE_KEY = 'overlay-library-broken-image-cache-v1'
const BROKEN_IMAGE_TTL_MS = 1000 * 60 * 60 * 24

function readPersistedBrokenImageCache() {
    try {
        const raw = localStorage.getItem(BROKEN_IMAGE_CACHE_KEY)
        if (!raw) return {}

        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return {}

        const now = Date.now()
        const cleaned = {}

        for (const [url, ts] of Object.entries(parsed)) {
            if (!url) continue
            if (!Number.isFinite(ts)) continue
            if (now - ts > BROKEN_IMAGE_TTL_MS) continue
            cleaned[url] = ts
        }

        return cleaned
    } catch {
        return {}
    }
}

function writePersistedBrokenImageCache(cacheMap) {
    try {
        localStorage.setItem(BROKEN_IMAGE_CACHE_KEY, JSON.stringify(cacheMap))
    } catch {
        // Ignore storage quota/transient browser errors.
    }
}

function normalizeActions(data) {
    if (Array.isArray(data?.actions)) return data.actions
    if (Array.isArray(data)) return data
    return []
}

function isRemoteCacheableUrl(url) {
    const value = String(url || '').trim()
    if (!value) return false
    if (value.startsWith('/cache/')) return false
    if (value.startsWith('data:')) return false

    try {
        const parsed = new URL(value, window.location.origin)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}

function useOverlayLibraries() {
    const [giftFilter, setGiftFilter] = useState('')
    const [renderFilter, setRenderFilter] = useState('')
    const [gifts, setGifts] = useState([])
    const [renders, setRenders] = useState([])
    const [actions, setActions] = useState([])
    const [brokenImageMap, setBrokenImageMap] = useState(() => readPersistedBrokenImageCache())

    function markImageBroken(url) {
        const key = String(url || '').trim()
        if (!key) return

        setBrokenImageMap((prev) => {
            if (prev[key]) return prev
            const next = { ...prev, [key]: Date.now() }
            writePersistedBrokenImageCache(next)
            return next
        })
    }

    async function loadLibraries() {
        try {
            const [giftsRes, rendersRes, actionsData] = await Promise.all([
                fetch(resolveBackendUrl('/data/regalos_tiktok.json'), { credentials: 'include' }).catch(() => null),
                fetch(resolveBackendUrl('/data/minecraft_renders.json'), { credentials: 'include' }).catch(() => null),
                apiGet('/api/actions').catch(() => [])
            ])

            const giftsData = giftsRes && giftsRes.ok ? await giftsRes.json() : []
            const rendersData = rendersRes && rendersRes.ok ? await rendersRes.json() : []

            const giftsList =
                Array.isArray(giftsData?.gifts) ? giftsData.gifts
                    : Array.isArray(giftsData?.items) ? giftsData.items
                        : Array.isArray(giftsData?.data) ? giftsData.data
                            : Array.isArray(giftsData) ? giftsData
                                : []

            const rendersList =
                Array.isArray(rendersData?.renders) ? rendersData.renders
                    : Array.isArray(rendersData?.items) ? rendersData.items
                        : Array.isArray(rendersData?.data) ? rendersData.data
                            : Array.isArray(rendersData) ? rendersData
                                : []

            const normalizedGifts = normalizeLibraryList(giftsList, 'gift')
            const normalizedRenders = normalizeLibraryList(rendersList, 'render')

            setGifts(normalizedGifts)
            setRenders(normalizedRenders)
            setActions(normalizeActions(actionsData))

            const cacheTargets = [
                ...normalizedGifts.map((item) => ({ kind: 'gift', item })),
                ...normalizedRenders.map((item) => ({ kind: 'render', item }))
            ].filter(({ item }) => isRemoteCacheableUrl(item.__image))

            // Limit concurrency for cache requests to avoid exhausting browser/server resources
            void (async () => {
                const limit = 6
                const results = []
                for (let i = 0; i < cacheTargets.length; i += limit) {
                    const batch = cacheTargets.slice(i, i + limit)
                    const batchResults = await Promise.allSettled(
                        batch.map(async ({ item }) => {
                            const url = String(item.__image || '').trim()
                            if (!url) return null

                            try {
                                const cached = await apiPost('/api/cache-image', { url })
                                const cachedUrl = cached?.cachedUrl ? String(cached.cachedUrl) : ''
                                if (!cachedUrl) return null

                                return { originalUrl: url, cachedUrl: resolveBackendUrl(cachedUrl) }
                            } catch {
                                return null
                            }
                        })
                    )
                    results.push(...batchResults)
                }

                const urlMap = new Map()
                for (const result of results) {
                    if (result.status !== 'fulfilled' || !result.value) continue
                    urlMap.set(result.value.originalUrl, result.value.cachedUrl)
                }

                if (urlMap.size === 0) return

                setGifts((prev) => prev.map((item) => ({
                    ...item,
                    __cachedImage: urlMap.get(item.__image) || item.__cachedImage || ''
                })))
                setRenders((prev) => prev.map((item) => ({
                    ...item,
                    __cachedImage: urlMap.get(item.__image) || item.__cachedImage || ''
                })))
            })()
        } catch (error) {
            console.error('loadLibraries error:', error)
            setGifts([])
            setRenders([])
            setActions([])
        }
    }

    useEffect(() => {
        loadLibraries()
    }, [])

    const filteredGifts = useMemo(() => {
        const normalized = normalizeLibraryList(gifts, 'gift').filter((item) => !brokenImageMap[item.__image])
        const term = giftFilter.trim().toLowerCase()

        if (!term) return normalized
        return normalized.filter((item) => item.__name.toLowerCase().includes(term))
    }, [gifts, giftFilter, brokenImageMap])

    const filteredRenders = useMemo(() => {
        const normalized = normalizeLibraryList(renders, 'render').filter((item) => !brokenImageMap[item.__image])
        const term = renderFilter.trim().toLowerCase()

        if (!term) return normalized
        return normalized.filter((item) => item.__name.toLowerCase().includes(term))
    }, [renders, renderFilter, brokenImageMap])

    return {
        actions,
        filteredGifts,
        filteredRenders,
        giftFilter,
        markImageBroken,
        renderFilter,
        setGiftFilter,
        setRenderFilter,
        reloadLibraries: loadLibraries
    }
}

export default useOverlayLibraries
