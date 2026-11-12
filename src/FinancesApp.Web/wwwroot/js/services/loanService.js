// services/loanService.js
// Préstecs guardats al JSON del backend.
import { apiService } from './apiService.js'

export const loanService = {
  getAll() {
    return apiService.request('/loans')
  },
}
