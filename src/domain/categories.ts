/**
 * Category keyword dictionary for auto-suggestion
 * Priority order matters: first match wins
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vinos: [
    "vino",
    "malbec",
    "cabernet",
    "chardonnay",
    "syrah",
    "bianchi",
    "zuccardi",
    "luigi bosca",
    "salentein",
    "catena",
  ],
  super: ["coto", "disco", "carrefour", "jumbo", "dia", "supermercado"],
  delivery: ["rappi", "pedidosya", "uber eats", "delivery"],
  salidas: ["bar", "resto", "restaurante", "cine", "asado"],
  hogar: [
    "ferreteria",
    "ikea",
    "easy",
    "sodimac",
    "marisa", // Cuando viene a limpiar la casa
  ],
  viajes: [
    "viaje",
    "viajes",
    "pasajes",
    "hotel",
    "hospedaje",
    "alojamiento",
    "alojamiento",
  ],
  transporte: [
    "transmilenio",
    "metro",
    "bus",
    "subte",
  ],
  taxi: ["taxi", "uber", "cabify", "didi", "beat", "remis"]
};

const DEFAULT_CATEGORY = "otros";

/**
 * Infer category from description text
 * Returns the first matching category by priority, or "otros" if none matches
 */
export function inferCategory(description: string): string {
  const lowerDesc = description.toLowerCase();

  // Check each category in priority order
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }

  return DEFAULT_CATEGORY;
}

/**
 * Validate if a category exists
 */
export function isValidCategory(category: string): boolean {
  return (
    category === DEFAULT_CATEGORY ||
    Object.keys(CATEGORY_KEYWORDS).includes(category)
  );
}
