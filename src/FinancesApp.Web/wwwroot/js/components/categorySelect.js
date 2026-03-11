import { categoryService } from '../services/categoryService.js'

export class CategorySelect {
  constructor(selectId, type = null) {
    this.select = document.getElementById(selectId)
    this.type = type // 'income', 'expense', o null per totes
  }

  async render(selectedId = null) {
    try {
      const categories = await categoryService.getAll(this.type)

      this.select.innerHTML = `
        <option value="">Selecciona categoria...</option>
        ${categories
          .map(
            c => `
          <option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>
            ${c.icon || '📁'} ${c.name}
          </option>
        `
          )
          .join('')}
      `

      // Afegir estil de color quan es selecciona
      this.select.addEventListener('change', e => {
        const selected = categories.find(c => c.id == e.target.value)
        if (selected) {
          this.select.style.borderLeft = `4px solid ${selected.color}`
        } else {
          this.select.style.borderLeft = ''
        }
      })
    } catch (error) {
      this.select.innerHTML = '<option value="">Error carregant categories</option>'
    }
  }

  getValue() {
    return parseInt(this.select.value) || null
  }

  setValue(id) {
    this.select.value = id
    this.select.dispatchEvent(new Event('change'))
  }
}
