const API_URL = 'http://localhost:5158/api' // ← Puerto 5158, no 5000

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`
    const config = {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    }

    if (config.body) config.body = JSON.stringify(config.body)

    console.log('🚀 Enviant petició:', {
      url,
      method: config.method || 'GET',
      body: config.body,
    })

    try {
      const response = await fetch(url, config)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  getTransactions(filters = {}) {
    const params = new URLSearchParams(filters)
    return this.request(`/transactions?${params}`)
  }

  createTransaction(data) {
    return this.request('/transactions', { method: 'POST', body: data })
  }

  deleteTransaction(id) {
    return this.request(`/transactions/${id}`, { method: 'DELETE' })
  }

  getSummary(year, month) {
    return this.request(`/reports/summary?year=${year}&month=${month}`)
  }
}

export const apiService = new ApiService()
