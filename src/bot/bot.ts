import "dotenv/config";
import { Telegraf } from "telegraf";
import { initDB } from "../infra/db";
import { registerCommands } from "./commands";

// Validar token antes de crear el bot
const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!token) {
  console.error("❌ ERROR: TELEGRAM_BOT_TOKEN o BOT_TOKEN no está definido en .env");
  console.error("   Por favor, crea un archivo .env con: TELEGRAM_BOT_TOKEN=tu_token_aqui");
  process.exit(1);
}

console.log("🔧 Inicializando bot...");
export const bot = new Telegraf(token);

// Register all commands
console.log("📝 Registrando comandos...");
registerCommands(bot);
console.log("✅ Comandos registrados");

// Launch bot
export async function launchBot() {
  try {
    // Inicializar DB primero
    console.log("💾 Inicializando base de datos...");
    await initDB();
    console.log("✅ Base de datos inicializada");

    // Luego lanzar el bot
    console.log("🚀 Iniciando bot...");
    
    bot.launch()
    console.log("🤖 Bot corriendo...");
    const botInfo = await bot.telegram.getMe();
    console.log(`   Bot username: @${botInfo.username}`);
    console.log(`   Bot ID: ${botInfo.id}`);
    
  } catch (error) {
    console.error("❌ Error al iniciar el bot:", error);
    if (error instanceof Error) {
      console.error("   Mensaje:", error.message);
      console.error("   Stack:", error.stack);
    }
    console.error("   Verifica que el token sea válido y que tengas conexión a internet");
    process.exit(1);
  }

  // Graceful shutdown
  process.once("SIGINT", () => {
    console.log("\n🛑 Deteniendo bot...");
    bot.stop("SIGINT");
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    console.log("\n🛑 Deteniendo bot...");
    bot.stop("SIGTERM");
    process.exit(0);
  });
}