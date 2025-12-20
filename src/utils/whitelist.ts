/**
 * Verifica si un usuario está en la whitelist
 */
export function isUserAllowed(userId: string | number): boolean {
    const whitelistEnv = process.env.ALLOWED_USER_IDS || "";
    
    if (!whitelistEnv.trim()) {
      // Si no hay whitelist configurada, permitir a todos (modo desarrollo)
      console.warn("⚠️  ALLOWED_USER_IDS no configurado. Permitiendo acceso a todos.");
      return true;
    }
  
    const allowedIds = whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  
    return allowedIds.includes(String(userId));
  }
  
  /**
   * Obtiene la lista de IDs permitidos (para logging)
   */
  export function getAllowedUserIds(): string[] {
    const whitelistEnv = process.env.ALLOWED_USER_IDS || "";
    if (!whitelistEnv.trim()) return [];
    
    return whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }