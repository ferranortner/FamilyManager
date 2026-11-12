// utils/categoryOptions.js
// Utilitats compartides per agrupar categories per grup (sense repetir la lògica a cada vista).

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  )
}

export const NO_GROUP = 'Sense grup'

// Retorna [{ name, items }] amb els grups ordenats; "Sense grup" sempre al final
export function groupCategories(categories) {
  const map = new Map()
  for (const c of categories) {
    const key = (c.group || '').trim() || NO_GROUP
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(c)
  }
  const names = [...map.keys()].sort((a, b) => {
    if (a === NO_GROUP) return 1
    if (b === NO_GROUP) return -1
    return a.localeCompare(b, 'ca')
  })
  return names.map(name => ({ name, items: map.get(name) }))
}

// HTML d'<option> i <optgroup> per a un <select> de categories
// isSelected(c) → true si aquesta opció ha de sortir seleccionada
export function categoryOptionsHtml(categories, isSelected = () => false) {
  return groupCategories(categories)
    .map(
      g => `
      <optgroup label="${escapeHtml(g.name)}">
        ${g.items
          .map(
            c => `<option value="${c.id}" ${isSelected(c) ? 'selected' : ''}>${escapeHtml(c.icon || '•')} ${escapeHtml(c.name)}</option>`
          )
          .join('')}
      </optgroup>`
    )
    .join('')
}
