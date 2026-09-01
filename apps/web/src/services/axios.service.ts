import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { tokenStorage } from "@/lib/api/token-storage"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request: attach the access token
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

//  Response: on 401, refresh once and replay queued requests
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  pendingQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      throw error
    }

    // Don't try to "refresh" a failed refresh call itself
    if (originalRequest.url?.includes("/auth/refresh")) {
      tokenStorage.clear()
      window.location.href = "/login"
      throw error
    }

    if (isRefreshing) {
      // If a refresh is already in flight; queue this request and replay it
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) {
      tokenStorage.clear()
      window.location.href = "/login"
      throw error
    }

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      tokenStorage.setTokens(data.access_token, data.refresh_token)
      flushQueue(null, data.access_token)

      originalRequest.headers.Authorization = `Bearer ${data.access_token}`
      return api(originalRequest)
    } catch (refreshError) {
      flushQueue(refreshError, null)
      tokenStorage.clear()
      window.location.href = "/login"
      return refreshError
    } finally {
      isRefreshing = false
    }
  },
)

export default api
