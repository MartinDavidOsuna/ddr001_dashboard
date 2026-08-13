import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ProblemDetails, TokenPair } from './types'

const baseURL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
if (!baseURL && import.meta.env.PROD) console.warn('VITE_API_BASE_URL is not configured')
export const api = axios.create({ baseURL, timeout: 20_000, headers: { Accept: 'application/json' } })
let accessToken: string | null = null
let refreshPromise: Promise<string> | null = null
const refreshKey = 'ddr001.admin.refresh'

export function setAccessToken(token: string | null) { accessToken = token }
export function getStoredRefreshToken() { return sessionStorage.getItem(refreshKey) }
export function storeTokens(tokens: TokenPair | null) {
  setAccessToken(tokens?.accessToken ?? null)
  if (tokens) sessionStorage.setItem(refreshKey, tokens.refreshToken); else sessionStorage.removeItem(refreshKey)
}
async function refreshAccess() {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')
  const { data } = await axios.post<TokenPair>(`${baseURL}/admin/auth/refresh`, { refreshToken }, { timeout: 20_000 })
  storeTokens(data)
  return data.accessToken
}
api.interceptors.request.use((config) => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; return config })
api.interceptors.response.use(undefined, async (error: AxiosError<ProblemDetails>) => {
  const request = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
  if (error.response?.status !== 401 || !request || request._retry || request.url?.includes('/admin/auth/')) throw error
  request._retry = true
  refreshPromise ??= refreshAccess().finally(() => { refreshPromise = null })
  try { const token = await refreshPromise; request.headers.Authorization = `Bearer ${token}`; return api(request) }
  catch { storeTokens(null); window.dispatchEvent(new Event('ddr001:unauthorized')); throw error }
})
export function problemMessage(error: unknown, fallback = 'No fue posible completar la operación.') {
  if (axios.isAxiosError<ProblemDetails>(error)) return error.response?.data?.detail || error.response?.data?.title || (error.code === 'ECONNABORTED' ? 'La solicitud tardó demasiado.' : fallback)
  return fallback
}

