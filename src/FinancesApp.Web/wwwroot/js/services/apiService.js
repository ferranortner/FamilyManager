// services/apiService.js
// Client HTTP únic per a totes les crides al backend.

export const API_URL = 'http://localhost:5158/api'

class ApiService {
  async request(endpoint, options = {}) {
    const config = {
      method: 'GET',
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    }

    if (config.body !== undefined) config.body = JSON.stringify(config.body)

    const response = await fetch(`${API_URL}${endpoint}`, config)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${response.status}`)
    }

    // 204 No Content (DELETE / PUT sense cos)
    if (response.status === 204) return null

    return response.json()
  }
}

export const apiService = new ApiService()
