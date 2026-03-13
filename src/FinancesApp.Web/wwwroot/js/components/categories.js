import { categoryService } from '../services/categoryService.js'

export class CategoriesManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.editingId = null
    this.selectedImage = null // Emmagatzemar la imatge seleccionada
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
            <label>Icona</label>
            <div class="icon-selector">
              <div class="icon-tabs">
                <button type="button" class="icon-tab active" data-tab="emoji">Emoji</button>
                <button type="button" class="icon-tab" data-tab="image">Imatge</button>
              </div>

              <div class="icon-content" id="emoji-content">
                <input type="text" id="cat-icon" placeholder="Ex: 🛒 💰 🚗" maxlength="2">
                <small>Fes clic per seleccionar emoji o escriu-lo directament</small>
              </div>

              <div class="icon-content hidden" id="image-content">
                <div class="image-upload-area" id="image-upload-area">
                  <input type="file" id="cat-image" accept="image/*" hidden>
                  <div class="upload-placeholder" id="upload-placeholder">
                    <span class="upload-icon">📷</span>
                    <span class="upload-text">Arrossega una imatge o fes clic per seleccionar</span>
                    <span class="upload-hint">PNG, JPG, GIF (màx. 2MB)</span>
                  </div>
                  <img id="image-preview" class="image-preview hidden" alt="Preview">
                  <button type="button" id="remove-image" class="btn-remove-image hidden">✕</button>
                </div>
              </div>
            </div>
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
    // Determinar si mostrar emoji o imatge
    const hasImage = category.imageUrl || category.imageData
    const iconDisplay = hasImage ? `<img src="${category.imageUrl || category.imageData}" alt="${category.name}" class="category-img">` : `<span class="category-emoji">${category.icon || '📁'}</span>`

    return `
      <div class="category-card" data-id="${category.id}">
        <div class="category-info">
          <span class="category-icon-wrapper" style="background: ${category.color}20; color: ${category.color}">
            ${iconDisplay}
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

    // Tabs d'icona (emoji vs imatge)
    document.querySelectorAll('.icon-tab').forEach(tab => {
      tab.addEventListener('click', e => this.switchIconTab(e.target.dataset.tab))
    })

    // Upload d'imatge
    const uploadArea = document.getElementById('image-upload-area')
    const fileInput = document.getElementById('cat-image')
    const removeBtn = document.getElementById('remove-image')

    uploadArea?.addEventListener('click', e => {
      if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
        fileInput?.click()
      }
    })

    uploadArea?.addEventListener('dragover', e => {
      e.preventDefault()
      uploadArea.classList.add('dragover')
    })

    uploadArea?.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover')
    })

    uploadArea?.addEventListener('drop', e => {
      e.preventDefault()
      uploadArea.classList.remove('dragover')
      const files = e.dataTransfer.files
      if (files.length > 0) {
        this.handleImageSelect(files[0])
      }
    })

    fileInput?.addEventListener('change', e => {
      if (e.target.files.length > 0) {
        this.handleImageSelect(e.target.files[0])
      }
    })

    removeBtn?.addEventListener('click', e => {
      e.stopPropagation()
      this.removeImage()
    })

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

  switchIconTab(tab) {
    // Actualitzar tabs
    document.querySelectorAll('.icon-tab').forEach(t => t.classList.remove('active'))
    document.querySelector(`.icon-tab[data-tab="${tab}"]`)?.classList.add('active')

    // Mostrar/amagar contingut
    document.getElementById('emoji-content')?.classList.toggle('hidden', tab !== 'emoji')
    document.getElementById('image-content')?.classList.toggle('hidden', tab !== 'image')
  }

  handleImageSelect(file) {
    // Validar tipus de fitxer
    if (!file.type.startsWith('image/')) {
      alert('Si us plau, selecciona un arxiu imatge vàlid')
      return
    }

    // Validar mida (màx. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imatge és massa gran. Màxim 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      this.selectedImage = e.target.result
      this.showImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  showImagePreview(imageData) {
    const placeholder = document.getElementById('upload-placeholder')
    const preview = document.getElementById('image-preview')
    const removeBtn = document.getElementById('remove-image')

    placeholder?.classList.add('hidden')
    preview?.classList.remove('hidden')
    removeBtn?.classList.remove('hidden')
    preview.src = imageData
  }

  removeImage() {
    this.selectedImage = null
    const fileInput = document.getElementById('cat-image')
    const placeholder = document.getElementById('upload-placeholder')
    const preview = document.getElementById('image-preview')
    const removeBtn = document.getElementById('remove-image')

    if (fileInput) fileInput.value = ''
    placeholder?.classList.remove('hidden')
    preview?.classList.add('hidden')
    removeBtn?.classList.add('hidden')
    if (preview) preview.src = ''
  }

  showForm(category = null) {
    const container = document.getElementById('category-form-container')
    const title = document.getElementById('form-title')

    container.classList.remove('hidden')
    title.textContent = category ? 'Editar Categoria' : 'Nova Categoria'

    // Reset imatge
    this.selectedImage = null
    this.removeImage()
    this.switchIconTab('emoji')

    if (category) {
      document.getElementById('cat-name').value = category.name
      document.getElementById('cat-type').value = category.type
      document.getElementById('cat-color').value = category.color || '#6b7280'

      // Comprovar si té imatge o emoji
      if (category.imageUrl || category.imageData) {
        this.switchIconTab('image')
        this.selectedImage = category.imageUrl || category.imageData
        this.showImagePreview(this.selectedImage)
      } else {
        document.getElementById('cat-icon').value = category.icon || ''
      }

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
    this.selectedImage = null
    this.removeImage()
  }

  async handleSubmit(e) {
    e.preventDefault()

    const activeTab = document.querySelector('.icon-tab.active')?.dataset.tab

    const category = {
      name: document.getElementById('cat-name').value.trim(),
      type: document.getElementById('cat-type').value,
      color: document.getElementById('cat-color').value,
    }

    // Afegir emoji o imatge segons la pestanya activa
    if (activeTab === 'image' && this.selectedImage) {
      category.imageData = this.selectedImage
      category.icon = null
    } else {
      category.icon = document.getElementById('cat-icon').value.trim()
      category.imageData = null
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
