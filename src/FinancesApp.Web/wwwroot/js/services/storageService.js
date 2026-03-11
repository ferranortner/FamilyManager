// js/services/storageService.js
class StorageService {
  constructor() {
    this.prefix = 'financeApp_'
  }

  // Caché local per dades freqüents
  setLocal(key, data) {
    localStorage.setItem(
      `${this.prefix}${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    )
  }

  getLocal(key, maxAge = 5 * 60 * 1000) {
    // 5 minuts per defecte
    const item = localStorage.getItem(`${this.prefix}${key}`)
    if (!item) return null

    const { data, timestamp } = JSON.parse(item)
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(`${this.prefix}${key}`)
      return null
    }
    return data
  }

  clearCache() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key))
  }

  // Exportar/Importar dades (backup/restore)
  exportData() {
    const data = {
      transactions: this.getLocal('transactions') || [],
      categories: this.getLocal('categories') || [],
      exportDate: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()

    URL.revokeObjectURL(url)
  }

  async importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result)
          // Validar estructura
          if (data.transactions) this.setLocal('transactions', data.transactions)
          if (data.categories) this.setLocal('categories', data.categories)
          resolve(data)
        } catch (error) {
          reject(error)
        }
      }
      reader.readAsText(file)
    })
  }
}

export const storageService = new StorageService()
