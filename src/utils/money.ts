/**
 * Parse money input to cents (integer minor units)
 * Supports: integers, decimals, thousand separators (both . and ,)
 * Examples:
 * - "12500" -> 1250000 (12500 ARS = 1250000 cents)
 * - "12500.50" -> 1250050
 * - "12.500" -> 1250000
 * - "12,500.50" -> 1250050
 */
export function parseMoney(input: string): number {
    // Remove all spaces
    let cleaned = input.trim().replace(/\s/g, "");
    
    // Handle thousand separators: remove dots/commas that are not decimal separators
    // Strategy: if there's a dot/comma near the end, it's likely decimal
    // Otherwise, remove all separators
    
    // Check if last 3 chars contain a dot/comma (likely decimal separator)
    const lastPart = cleaned.slice(-4);
    const hasDecimalSeparator = /[.,]\d{1,2}$/.test(lastPart);
    
    if (hasDecimalSeparator) {
      // Has decimal part: remove thousand separators, keep last dot/comma as decimal
      // Replace all dots/commas except the last one
      const parts = cleaned.split(/[.,]/);
      if (parts.length > 2) {
        // Multiple separators: all but last are thousands
        const integerPart = parts.slice(0, -1).join("");
        const decimalPart = parts[parts.length - 1].padEnd(2, "0").slice(0, 2);
        cleaned = integerPart + "." + decimalPart;
      } else {
        // Only one separator: could be decimal or thousand
        // If decimal part is 1-2 digits, treat as decimal
        if (parts[1].length <= 2) {
          cleaned = parts[0] + "." + parts[1].padEnd(2, "0").slice(0, 2);
        } else {
          // Treat as thousand separator
          cleaned = parts.join("");
        }
      }
    } else {
      // No decimal part: remove all dots/commas
      cleaned = cleaned.replace(/[.,]/g, "");
    }
    
    // Parse as float and convert to cents
    const amount = parseFloat(cleaned);
    if (isNaN(amount) || amount < 0) {
      throw new Error("Invalid amount");
    }
    
    return Math.round(amount * 100);
  }
  
  /**
   * Format cents to locale string (es-AR format: 12.500,50)
   */
  export function formatMoney(cents: number): string {
    const amount = cents / 100;
    return amount.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }