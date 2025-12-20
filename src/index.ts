console.log("🎯 Iniciando aplicación...");
import { launchBot } from "./bot/bot";
import { startHealthServer } from "./infra/healthServer";

startHealthServer();
launchBot().catch((error) => {
  console.error("❌ Error fatal:", error);
  process.exit(1);
});