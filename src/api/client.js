// src/api/client.js - Funciones de cliente para interactuar con la API del backend.
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')

export function resolveBackendUrl(path) {
  const input = String(path || '').trim()
  if (!input) return API_BASE_URL || '/'

  if (/^https?:\/\//i.test(input)) {
    return input
  }

  const normalizedPath = input.startsWith('/') ? input : `/${input}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(resolveBackendUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const error = new Error(data?.error || `HTTP ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function apiGet(path) {
  return apiFetch(path, { method: 'GET' })
}

export function apiPost(path, body = {}) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export function apiPut(path, body = {}) {
  return apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

export function apiPatch(path, body = {}) {
  return apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

export function apiDelete(path) {
  return apiFetch(path, {
    method: 'DELETE'
  })
}

export function apiPostRaw(path, body = {}) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}