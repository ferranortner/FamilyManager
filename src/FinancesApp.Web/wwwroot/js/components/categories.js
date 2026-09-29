import { categoryService } from '../services/categoryService.js'

export class CategoriesManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.editingId = null
    this.selectedImage = null
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-header">
      
        <div class="page-actions">
          <button id="btn-new-category" class="btn-app btn-app-primary">
            <i class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 4px;">add</i>
            Nova Categoria
          </button>
        </div>
      </div>

      <div id="category-form-container" class="card hidden" style="margin-bottom: 24px;">
        <div class="card-header">
          <h3 id="form-title" class="card-title">Nova Categoria</h3>
        </div>
        <div class="card-body">
          <form id="category-form">
            <div class="form-group">
              <label class="form-label" for="cat-name">Nom de la categoria</label>
              <input type="text" id="cat-name" class="form-control" required placeholder="Ex: Supermercat, Nòmina, Oci...">
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label class="form-label" for="cat-type">Tipus</label>
                <select id="cat-type" class="form-select" required>
                  <option value="expense">Despesa</option>
                  <option value="income">Ingrés</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="cat-color">Color identificatiu</label>
                <input type="color" id="cat-color" class="form-control" value="#6b7280" style="height: 42px; padding: 4px;">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Icona o Imatge</label>
              <div class="icon-selector">
                <div class="icon-tabs" style="display: flex; gap: 8px; margin-bottom: 12px;">
                  <button type="button" class="btn-app btn-app-secondary icon-tab active" data-tab="emoji" style="font-size: 0.875rem;">
                    <i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">emoji_emotions</i> Emoji
                  </button>
                  <button type="button" class="btn-app btn-app-secondary icon-tab" data-tab="image" style="font-size: 0.875rem;">
                    <i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">image</i> Imatge
                  </button>
                </div>

                <div class="icon-content" id="emoji-content">
                  <input type="text" id="cat-icon" class="form-control" placeholder="Ex: 🛒 💰 🚗" maxlength="2" style="max-width: 100px; font-size: 1.0rem; text-align: center;">
                  <span class="form-text" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">Fes clic per seleccionar un emoji o escriu-lo directament.</span>
                </div>

                <div class="icon-content hidden" id="image-content">
                  <div class="image-upload-area" id="image-upload-area" style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s;">
                    <input type="file" id="cat-image" accept="image/*" hidden>
                    <div class="upload-placeholder" id="upload-placeholder">
                      <i class="material-icons" style="font-size: 32px; color: var(--text-muted); margin-bottom: 8px;">cloud_upload</i>
                      <p style="margin: 0; font-weight: 500; color: var(--text-color);">Arrossega una imatge o fes clic per seleccionar</p>
                      <p class="form-text" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">PNG, JPG, GIF (màx. 2MB)</p>
                    </div>
                    <img id="image-preview" class="image-preview hidden" alt="Preview" style="max-width: 100%; max-height: 150px; border-radius: var(--radius-sm); margin: 0 auto; display: block;">
                    <button type="button" id="remove-image" class="btn-app btn-app-ghost btn-app-sm hidden" style="margin-top: 8px; color: var(--result-error-text);">
                      <i class="material-icons" style="font-size: 16px; vertical-align: middle;">delete</i> Eliminar imatge
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
              <button type="button" id="btn-cancel" class="btn-app btn-app-secondary">Cancel·lar</button>
              <button type="submit" class="btn-app btn-app-primary">Guardar Categoria</button>
            </div>
          </form>
        </div>
      </div>

      <div id="categories-list" class="categories-grid">
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
            <i class="material-icons empty-state-icon">category</i>
            <h3 class="empty-state-title">No hi ha categories</h3>
            <p>Crea la teva primera categoria per començar a organitzar les teves finances.</p>
            <button onclick="document.getElementById('btn-new-category').click()" class="btn-app btn-app-primary" style="margin-top: 16px;">
              Crear categoria
            </button>
          </div>
        `
      }

      const incomeCats = this.categories.filter(c => c.type === 'income')
      const expenseCats = this.categories.filter(c => c.type === 'expense')

      return `
        ${
          incomeCats.length > 0
            ? `
        <div class="category-section" style="margin-bottom: 32px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <i class="material-icons" style="color: var(--result-success-text);">trending_up</i>
            <h4 style="margin: 0; font-size: 0.875rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Ingressos</h4>
          </div>
          <div class="category-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
            ${incomeCats.map(c => this.renderCategoryCard(c)).join('')}
          </div>
        </div>
        `
            : ''
        }

        ${
          expenseCats.length > 0
            ? `
        <div class="category-section">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <i class="material-icons" style="color: var(--result-error-text);">trending_down</i>
            <h4 style="margin: 0; font-size: 0.875rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Despeses</h4>
          </div>
          <div class="category-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
            ${expenseCats.map(c => this.renderCategoryCard(c)).join('')}
          </div>
        </div>
        `
            : ''
        }
      `
    } catch (error) {
      return `
        <div class="empty-state">
          <i class="material-icons empty-state-icon" style="color: var(--result-error-text);">error</i>
          <h3 class="empty-state-title">Error de connexió</h3>
          <p>No s'han pogut carregar les categories: ${error.message}</p>
        </div>
      `
    }
  }

  renderCategoryCard(category) {
    const hasImage = category.imageUrl || category.imageData
    const iconDisplay = hasImage
      ? `<img src="${category.imageUrl || category.imageData}" alt="${category.name}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`
      : `<span style="font-size: 1.25rem;">${category.icon || '📁'}</span>`

    // Colors segons el tipus
    const bgColor =
      category.type === 'income'
        ? `${category.color}15` // Verd molt suau (15% opacitat)
        : `${category.color}15` // Vermell molt suau (15% opacitat)

    const borderColor =
      category.type === 'income'
        ? `${category.color}40` // Verd 40% opacitat
        : `${category.color}40` // Vermell 40% opacitat

    return `
    <div class="category-card-compact" data-id="${category.id}" style="
      background: ${bgColor};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      padding: 12px;
      transition: all 0.2s;
      cursor: pointer;
      position: relative;
    ">
      <div style="position: absolute; top: 6px; right: 6px; display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s;" class="category-actions">
        <button class="btn-icon-action edit" data-id="${category.id}" title="Editar" style="
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 2px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="material-icons" style="font-size: 14px;">edit</i>
        </button>
        <button class="btn-icon-action delete" data-id="${category.id}" title="Eliminar" style="
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 2px;
          color: var(--result-error-text);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="material-icons" style="font-size: 14px;">delete</i>
        </button>
      </div>
      
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px;">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: ${category.color}30;
          color: ${category.color};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${iconDisplay}
        </div>
        <div style="
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-color);
          word-break: break-word;
          line-height: 1.2;
        ">${category.name}</div>
      </div>
    </div>
  `
  }

  attachEvents() {
    document.getElementById('btn-new-category')?.addEventListener('click', () => this.showForm())
    document.getElementById('btn-cancel')?.addEventListener('click', () => this.hideForm())
    document.getElementById('category-form')?.addEventListener('submit', e => this.handleSubmit(e))

    document.querySelectorAll('.icon-tab').forEach(tab => {
      tab.addEventListener('click', e => this.switchIconTab(e.target.closest('.icon-tab').dataset.tab))
    })

    const uploadArea = document.getElementById('image-upload-area')
    const fileInput = document.getElementById('cat-image')
    const removeBtn = document.getElementById('remove-image')

    uploadArea?.addEventListener('click', e => {
      if (e.target !== removeBtn && !removeBtn.contains(e.target) && !e.target.closest('#remove-image')) {
        fileInput?.click()
      }
    })

    uploadArea?.addEventListener('dragover', e => {
      e.preventDefault()
      uploadArea.style.borderColor = 'var(--primary-color)'
      uploadArea.style.background = 'var(--bg-color)'
    })

    uploadArea?.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = 'var(--border-color)'
      uploadArea.style.background = 'transparent'
    })

    uploadArea?.addEventListener('drop', e => {
      e.preventDefault()
      uploadArea.style.borderColor = 'var(--border-color)'
      uploadArea.style.background = 'transparent'
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

    // ==========================================
    // Delegació d'esdeveniments per a les targetes COMPACTES
    // ==========================================
    const listContainer = document.getElementById('categories-list')

    // Utilitzem 'mouseover' (bubbling) en lloc de 'mouseenter' amb capture
    listContainer?.addEventListener('mouseover', e => {
      const card = e.target.closest('.category-card-compact')
      if (card) {
        const actions = card.querySelector('.category-actions')
        if (actions) actions.style.opacity = '1'
      }
    })

    listContainer?.addEventListener('mouseout', e => {
      const card = e.target.closest('.category-card-compact')
      if (card) {
        const actions = card.querySelector('.category-actions')
        if (actions) actions.style.opacity = '0'
      }
    })

    listContainer?.addEventListener('click', async e => {
      const btn = e.target.closest('.btn-icon-action')
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
    document.querySelectorAll('.icon-tab').forEach(t => {
      t.classList.remove('active', 'btn-app-primary')
      t.classList.add('btn-app-secondary')
    })
    const activeTab = document.querySelector(`.icon-tab[data-tab="${tab}"]`)
    if (activeTab) {
      activeTab.classList.add('active', 'btn-app-primary')
      activeTab.classList.remove('btn-app-secondary')
    }

    document.getElementById('emoji-content')?.classList.toggle('hidden', tab !== 'emoji')
    document.getElementById('image-content')?.classList.toggle('hidden', tab !== 'image')
  }

  handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
      alert("Si us plau, selecciona un arxiu d'imatge vàlid.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imatge és massa gran. El màxim permès és 2MB.')
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

    // Scroll suau cap al formulari
    container.scrollIntoView({ behavior: 'smooth', block: 'start' })

    this.selectedImage = null
    this.removeImage()
    this.switchIconTab('emoji')

    if (category) {
      document.getElementById('cat-name').value = category.name
      document.getElementById('cat-type').value = category.type
      document.getElementById('cat-color').value = category.color || '#6b7280'

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
      alert('Error guardant la categoria: ' + error.message)
    }
  }

  async editCategory(id) {
    const category = this.categories.find(c => c.id === id)
    if (category) {
      this.showForm(category)
    }
  }

  async deleteCategory(id) {
    if (!confirm('Segur que vols eliminar aquesta categoria? Aquesta acció no es pot desfer.')) return

    try {
      await categoryService.delete(id)
      await this.refreshList()
    } catch (error) {
      alert('Error eliminant la categoria: ' + error.message)
    }
  }

  async refreshList() {
    const listContainer = document.getElementById('categories-list')
    listContainer.innerHTML = await this.renderCategoriesList()
  }
}
