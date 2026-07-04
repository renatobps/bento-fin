export interface CategoryTotal {
  name: string;
  icon: string | null;
  total: number;
}

export function groupByCategory<
  T extends { category: string; categoryIcon: string | null; amount: number },
>(items: T[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();

  for (const item of items) {
    const existing = map.get(item.category) ?? {
      name: item.category,
      icon: item.categoryIcon,
      total: 0,
    };
    existing.total += item.amount;
    map.set(item.category, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
