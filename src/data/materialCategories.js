/**
 * Kategorije za materijal i radove — dodajte nove { id, label } unose za nove grupe.
 * `id` mora biti stabilan (koristi se u bazi i kodu).
 */
export const MATERIAL_CATEGORIES = [
  { id: 'grubi-radovi', label: 'Grubi radovi' },
  { id: 'instalacije', label: 'Instalacije' },
  { id: 'enterijer', label: 'Enterijer' },
  { id: 'ostalo', label: 'Ostalo' },
]

export const DEFAULT_MATERIAL_CATEGORY_ID = MATERIAL_CATEGORIES[0].id

export function getCategoryLabel(categoryId) {
  const c = MATERIAL_CATEGORIES.find((x) => x.id === categoryId)
  return c?.label ?? 'Ostalo'
}

export function normalizeCategoryId(categoryId) {
  if (MATERIAL_CATEGORIES.some((c) => c.id === categoryId)) return categoryId
  return 'ostalo'
}
