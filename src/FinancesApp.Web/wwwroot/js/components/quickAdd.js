// components/quickAdd.js
// Alta ràpida d'una transacció des de qualsevol vista (pensada per al mòbil).
import { financeService } from '../services/financeService.js'
import { categoryService } from '../services/categoryService.js'
import { categoryOptionsHtml, escapeHtml } from '../utils/categoryOptions.js'

export class QuickAdd {
  constructor() {
    this.categories = []
  }

  mount() {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'quick-add-fab'
    button.title = 'Afegir transacció'
    button.setAttribute('aria-label', 'Afegir transacció')
    button.textContent = '+'
    button.addEventListener('click', () => this.open())
    document.body.appendChild(button)

    const dialog = document.createElement('dialog')
    dialog.className = 'quick-add-dialog'
    dialog.id = 'quick-add-dialog'
    dialog.innerHTML = `
      <form method="dialog" id="quick-add-form" class="quick-add-form">
        <h3>Nova transacció</h3>
        <label>Import (€)
          <input type="number" id="qa-amount" class="form-control" min="0.01" step="0.01" required inputmode="decimal" autofocus>
        </label>
        <label>Tipus
          <select id="qa-type" class="form-control">
            <option value="expense">Despesa</option>
            <option value="income">Ingrés</option>
          </select>
        </label>
        <label>Categoria
          <select id="qa-category" class="form-control" required></select>
        </label>
        <label>Descripció
          <input type="text" id="qa-desc" class="form-control" maxlength="120" placeholder="Opcional">
        </label>
        <label>Data
          <input type="date" id="qa-date" class="form-control" required>
        </label>
        <p id="qa-status" class="hint"></p>
        <div class="quick-add-actions">
          <button type="button" id="qa-cancel" class="btn-app btn-app-secondary">Cancel·lar</button>
          <button type="submit" class="btn-app btn-app-primary">Desar</button>
        </div>
      </form>
    `
    document.body.appendChild(dialog)

    dialog.querySelector('#qa-cancel').addEventListener('click', () => dialog.close())
    dialog.querySelector('#quick-add-form').addEventListener('submit', e => this.submit(e))
    dialog.querySelector('#qa-type').addEventListener('change', () => this.fillCategories())
  }

  async open() {
    const dialog = document.getElementById('quick-add-dialog')
    document.getElementById('quick-add-form').reset()
    document.getElementById('qa-date').value = new Date().toISOString().slice(0, 10)
    document.getElementById('qa-status').textContent = ''

    try {
      this.categories = await categoryService.getAll()
    } catch (err) {
      document.getElementById('qa-status').textContent = 'No s\'han pogut carregar les categories.'
    }
    this.fillCategories()
    dialog.showModal()
    document.getElementById('qa-amount').focus()
  }

  fillCategories() {
    const type = document.getElementById('qa-type').value
    const filtered = this.categories.filter(c => c.type === type)
    document.getElementById('qa-category').innerHTML =
      `<option value="">Selecciona…</option>${categoryOptionsHtml(filtered)}`
  }

  async submit(e) {
    e.preventDefault()
    const status = document.getElementById('qa-status')
    const categoryId = parseInt(document.getElementById('qa-category').value)
    if (!categoryId) {
      status.textContent = 'Selecciona una categoria.'
      return
    }

    const data = {
      accountId: 1,
      categoryId,
      amount: parseFloat(document.getElementById('qa-amount').value),
      description: document.getElementById('qa-desc').value.trim(),
      date: document.getElementById('qa-date').value,
      type: document.getElementById('qa-type').value,
      accountingPercentage: 100,
    }

    try {
      await financeService.addTransaction(data)
      document.getElementById('quick-add-dialog').close()
      window.dispatchEvent(new CustomEvent('transaction-added', { detail: data }))
    } catch (err) {
      status.textContent = 'Error desant: ' + escapeHtml(err.message)
    }
  }
}
