console.log("🎯 Iniciando aplicación...");
import { launchBot } from "./bot/bot";

launchBot().catch((error) => {
  console.error("❌ Error fatal:", error);
  process.exit(1);
});