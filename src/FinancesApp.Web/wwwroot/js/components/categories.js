import { categoryService } from '../services/categoryService.js'

export class CategoriesManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.editingId = null
  }

  async render() {
    this.container.innerHTML = `
      <div class="categories-header">
        <h2>Gestió de Categories</h2>
        <button id="btn-new-category" class="btn btn-primary">+ Nova Categoria</button>
      </div>
      
      <div id="category-form-container" class="form-container hidden">
        <h3 id="form-title">Nova Categoria</h3>
        <form id="category-form">
          <div class="form-group">
            <label>Nom</label>
            <input type="text" id="cat-name" required placeholder="Ex: Compres, Nòmina...">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Tipus</label>
              <select id="cat-type" required>
                <option value="expense">Despesa</option>
                <option value="income">Ingressos</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Color</label>
              <input type="color" id="cat-color" value="#6b7280">
            </div>
          </div>
          
          <div class="form-group">
            <label>Icona (emoji)</label>
            <input type="text" id="cat-icon" placeholder="Ex: 🛒 💰 🚗" maxlength="2">
          </div>
          
          <div class="form-actions">
            <button type="button" id="btn-cancel" class="btn btn-secondary">Cancel·lar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
      
      <div class="categories-grid" id="categories-list">
        ${await this.renderCategoriesList()}
      </div>
    `

    this.attachEvents()
  }

  async renderCategoriesList() {
    try {
      this.categories = await categoryService.getAll()

      if (this.categories.length === 0) {
        return `
          <div class="empty-state">
            <p>No hi ha categories. Crea la primera!</p>
            <button onclick="document.getElementById('btn-new-category').click()" class="btn btn-primary">
              Crear categoria
            </button>
          </div>
        `
      }

      const incomeCats = this.categories.filter(c => c.type === 'income')
      const expenseCats = this.categories.filter(c => c.type === 'expense')

      return `
        <div class="category-section">
          <h4>💰 Ingressos</h4>
          <div class="category-list">
            ${incomeCats.map(c => this.renderCategoryCard(c)).join('')}
          </div>
        </div>
        
        <div class="category-section">
          <h4>💸 Despeses</h4>
          <div class="category-list">
            ${expenseCats.map(c => this.renderCategoryCard(c)).join('')}
          </div>
        </div>
      `
    } catch (error) {
      return `<div class="error">Error carregant categories: ${error.message}</div>`
    }
  }

  renderCategoryCard(category) {
    return `
      <div class="category-card" data-id="${category.id}">
        <div class="category-info">
          <span class="category-icon" style="background: ${category.color}20; color: ${category.color}">
            ${category.icon || '📁'}
          </span>
          <div class="category-details">
            <span class="category-name">${category.name}</span>
            <span class="category-meta">${category.type === 'income' ? 'Ingressos' : 'Despeses'}</span>
          </div>
        </div>
        <div class="category-actions">
          <button class="btn-icon edit" data-id="${category.id}" title="Editar">✏️</button>
          <button class="btn-icon delete" data-id="${category.id}" title="Eliminar">🗑️</button>
        </div>
      </div>
    `
  }

  attachEvents() {
    // Nou/Editar
    document.getElementById('btn-new-category')?.addEventListener('click', () => this.showForm())
    document.getElementById('btn-cancel')?.addEventListener('click', () => this.hideForm())

    // Formulari
    document.getElementById('category-form')?.addEventListener('submit', e => this.handleSubmit(e))

    // Delegació d'events per editar/eliminar
    document.getElementById('categories-list')?.addEventListener('click', async e => {
      const btn = e.target.closest('.btn-icon')
      if (!btn) return

      const id = parseInt(btn.dataset.id)

      if (btn.classList.contains('edit')) {
        await this.editCategory(id)
      } else if (btn.classList.contains('delete')) {
        await this.deleteCategory(id)
      }
    })
  }

  showForm(category = null) {
    const container = document.getElementById('category-form-container')
    const title = document.getElementById('form-title')

    container.classList.remove('hidden')
    title.textContent = category ? 'Editar Categoria' : 'Nova Categoria'

    if (category) {
      document.getElementById('cat-name').value = category.name
      document.getElementById('cat-type').value = category.type
      document.getElementById('cat-color').value = category.color || '#6b7280'
      document.getElementById('cat-icon').value = category.icon || ''
      this.editingId = category.id
    } else {
      document.getElementById('category-form').reset()
      document.getElementById('cat-color').value = '#6b7280'
      this.editingId = null
    }
  }

  hideForm() {
    document.getElementById('category-form-container')?.classList.add('hidden')
    this.editingId = null
  }

  async handleSubmit(e) {
    e.preventDefault()

    const category = {
      name: document.getElementById('cat-name').value.trim(),
      type: document.getElementById('cat-type').value,
      color: document.getElementById('cat-color').value,
      icon: document.getElementById('cat-icon').value.trim(),
    }

    try {
      if (this.editingId) {
        await categoryService.update(this.editingId, category)
      } else {
        await categoryService.create(category)
      }

      this.hideForm()
      await this.refreshList()
    } catch (error) {
      alert('Error guardant: ' + error.message)
    }
  }

  async editCategory(id) {
    const category = this.categories.find(c => c.id === id)
    if (category) {
      this.showForm(category)
    }
  }

  async deleteCategory(id) {
    if (!confirm('Segur que vols eliminar aquesta categoria?')) return

    try {
      await categoryService.delete(id)
      await this.refreshList()
    } catch (error) {
      alert('Error eliminant: ' + error.message)
    }
  }

  async refreshList() {
    const listContainer = document.getElementById('categories-list')
    listContainer.innerHTML = await this.renderCategoriesList()
  }
}
