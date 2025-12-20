/**
 * Parse /g command arguments
 * Supports:
 * - /g 12500 descripción
 * - /g 12500 [categoría] descripción
 *
 * Returns: { amount: string, category: string | null, description: string }
 */
export function parseGastoCommand(text: string): {
  amount: string;
  category: string | null;
  description: string;
} {
  // Remove /g command
  const args = text.replace(/^\/g\s+/, "").trim();

  if (!args) {
    throw new Error("Missing arguments");
  }

  // Check for category override: [categoría]
  const categoryMatch = args.match(/\[([^\]]+)\]/);
  let category: string | null = null;
  let argsWithoutCategory = args;

  if (categoryMatch) {
    category = categoryMatch[1].trim();
    argsWithoutCategory = args.replace(/\[[^\]]+\]\s*/, "").trim();
  }

  // Extract amount (first token)
  const parts = argsWithoutCategory.split(/\s+/);
  if (parts.length < 2) {
    throw new Error("Missing amount or description");
  }

  const amount = parts[0];
  const description = parts.slice(1).join(" ").trim();

  if (!description) {
    throw new Error("Missing description");
  }

  return { amount, category, description };
}
