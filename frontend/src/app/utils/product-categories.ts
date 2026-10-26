export const CATEGORIES = [
  { value: 'ALL',         labelKey: 'category.all' },
  { value: 'FAST_FOOD',   labelKey: 'category.fastFood' },
  { value: 'GROCERY',     labelKey: 'category.grocery' },
  { value: 'CLOTHING',    labelKey: 'category.clothing' },
  { value: 'SERVICES',    labelKey: 'category.services' },
  { value: 'CRAFTS',      labelKey: 'category.crafts' },
  { value: 'AGRI',        labelKey: 'category.agri' },
  { value: 'ELECTRONICS', labelKey: 'category.electronics' },
  { value: 'OTHER',       labelKey: 'category.other' },
] as const;

const CATEGORY_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.labelKey])
);

const CATEGORY_ICONS: Record<string, string> = {
  FAST_FOOD: 'lunch_dining',
  GROCERY: 'local_grocery_store',
  CLOTHING: 'checkroom',
  SERVICES: 'handyman',
  CRAFTS: 'palette',
  AGRI: 'agriculture',
  ELECTRONICS: 'devices',
};

export function categoryLabelKey(category?: string): string | undefined {
  return category ? CATEGORY_LABEL_KEYS[category] : undefined;
}

export function categoryColor(category?: string): string | undefined {
  return category && CATEGORY_LABEL_KEYS[category] && category !== 'ALL'
    ? `var(--cat-${category.toLowerCase().replace('_', '-')})`
    : undefined;
}

export function categoryIcon(category?: string): string {
  return (category && CATEGORY_ICONS[category]) || 'storefront';
}
