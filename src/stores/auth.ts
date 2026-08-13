import { defineStore } from 'pinia'
import { api, getStoredRefreshToken, problemMessage, storeTokens } from '@/api/client'
import type { AuthClaims, TokenPair } from '@/api/types'
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null as AuthClaims | null, ready: false, loading: false, error: '' }),
  getters: { authenticated: (s) => !!s.user, displayRole: (s) => s.user?.role === 'viewer' ? 'Solo lectura' : s.user?.role === 'supervisor' ? 'Supervisor' : 'Administrador' },
  actions: {
    async login(email: string, password: string) { this.loading = true; this.error = ''; try { const { data } = await api.post<TokenPair>('/admin/auth/login', { email, password }); storeTokens(data); await this.me() } catch (e) { storeTokens(null); this.error = problemMessage(e, 'Credenciales inválidas.'); throw e } finally { this.loading = false } },
    async me() { const { data } = await api.get<AuthClaims>('/admin/auth/me'); this.user = data },
    async restore() { if (this.ready) return; try { const refreshToken=getStoredRefreshToken(); if (refreshToken) { const {data}=await api.post<TokenPair>('/admin/auth/refresh',{refreshToken});storeTokens(data);await this.me() } } catch { storeTokens(null); this.user = null } finally { this.ready = true } },
    async logout() { const refreshToken = getStoredRefreshToken(); try { if (refreshToken) await api.post('/admin/auth/logout', { refreshToken }) } finally { storeTokens(null); this.user = null } },
  },
})
