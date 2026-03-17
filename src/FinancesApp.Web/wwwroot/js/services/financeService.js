// services/financeService.js - Versió corregida
import { apiService } from './apiService.js'

export const financeService = {
  async getTransactions(year, month) {
    const params = new URLSearchParams()
    if (year) params.append('year', year)
    if (month) params.append('month', month)

    const response = await apiService.request(`/transactions?${params}`)

    // DEBUG: Veure què retorna el backend
    console.log('Resposta de getTransactions:', response)

    // Si el backend retorna { transactions: [...] }
    if (response && Array.isArray(response.transactions)) {
      return response.transactions
    }

    // Si el backend retorna [...] directament
    if (Array.isArray(response)) {
      return response
    }

    // Si retorna un objecte amb dades
    if (response && Array.isArray(response.data)) {
      return response.data
    }

    console.warn('Format de resposta inesperat:', response)
    return []
  },

  async addTransaction(data) {
    const payload = {
      accountId: parseInt(data.accountId) || 1,
      categoryId: parseInt(data.categoryId),
      amount: parseFloat(data.amount),
      description: data.description,
      date: data.date,
      type: data.type,
      accountingPercentage: parseInt(data.accountingPercentage) || 100, // ✅ Afegir aquesta línia
    }

    console.log('FinanceService - Enviant:', payload)

    const response = await apiService.request('/transactions', {
      method: 'POST',
      body: payload,
    })

    console.log('Transacció creada:', response)
    return response
  },

  async deleteTransaction(id) {
    return apiService.request(`/transactions/${id}`, {
      method: 'DELETE',
    })
  },

  async getSummary(year, month) {
    return apiService.request(`/transactions/summary?year=${year}&month=${month}`)
  },
  async updateTransaction(id, data) {
    const payload = {
      accountId: parseInt(data.accountId) || 1,
      categoryId: parseInt(data.categoryId),
      amount: parseFloat(data.amount),
      description: data.description,
      date: data.date,
      type: data.type,
      accountingPercentage: parseInt(data.accountingPercentage) || 100,
    }

    console.log('FinanceService - Actualitzant:', id, payload)

    return apiService.request(`/transactions/${id}`, {
      method: 'PUT',
      body: payload,
    })
  },
}
