/**
 * Administrativni troškovi — kategorije i šablonske stavke.
 * Dodajte novu kategoriju u ADMIN_COST_CATEGORIES, zatim stavku u ADMIN_TEMPLATE_ITEM_DEFS sa odgovarajućim categoryId.
 */
export const RSD_PER_EUR = 117

export const ADMIN_COST_CATEGORIES = [
  { id: 'takse', label: 'Takse' },
  { id: 'projekti', label: 'Projekti' },
  { id: 'doprinosi', label: 'Doprinosi' },
]

export const DEFAULT_ADMIN_CATEGORY_ID = ADMIN_COST_CATEGORIES[0].id

/** Šablonske stavke (iznosi iz formula ili fiksni RSD) */
export const ADMIN_TEMPLATE_ITEM_DEFS = [
  {
    id: 'arhitektonski-projekat',
    categoryId: 'projekti',
    label: 'Arhitektonski projekat',
    kind: 'arch_project',
  },
  {
    id: 'republiska-taksa',
    categoryId: 'takse',
    label: 'Republička taksa za zahtev',
    kind: 'fixed_rsd',
    amountRsd: 900,
  },
  {
    id: 'taksa-gradjevinska',
    categoryId: 'takse',
    label: 'Taksa za građevinsku dozvolu',
    kind: 'fixed_rsd',
    amountRsd: 5000,
  },
  {
    id: 'doprinos-gradsko-zemljiste',
    categoryId: 'doprinosi',
    label: 'Doprinos za gradsko zemljište',
    kind: 'doprinos_per_m2',
    ratePerM2Rsd: 2000,
  },
]

export function normalizeAdminCategoryId(categoryId) {
  if (ADMIN_COST_CATEGORIES.some((c) => c.id === categoryId)) return categoryId
  return DEFAULT_ADMIN_CATEGORY_ID
}

/**
 * @param {typeof ADMIN_TEMPLATE_ITEM_DEFS[0]} def
 * @param {{ m2: number, cenaArhitekteEur: number }} ctx
 */
export function computeTemplateItemRsd(def, ctx) {
  switch (def.kind) {
    case 'arch_project':
      return ctx.m2 * ctx.cenaArhitekteEur * RSD_PER_EUR
    case 'fixed_rsd':
      return Number(def.amountRsd) || 0
    case 'doprinos_per_m2':
      return ctx.m2 * (Number(def.ratePerM2Rsd) || 0)
    default:
      return 0
  }
}
