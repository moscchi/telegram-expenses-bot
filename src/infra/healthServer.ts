import { createServer } from "http";

const HEALTH_PATH = "/healthy";

function getHealthPort(): number {
  const value = Number(process.env.HEALTH_PORT || process.env.PORT || 3000);
  return Number.isFinite(value) && value > 0 ? value : 3000;
}

export function startHealthServer() {
  const port = getHealthPort();
  const server = createServer((req, res) => {
    const path = req.url?.split("?")[0];

    if ((req.method === "GET" || req.method === "HEAD") && path === HEALTH_PATH) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(port, () => {
    console.log(`🏥 Health endpoint disponible en http://localhost:${port}${HEALTH_PATH}`);
  });

  server.on("error", (error) => {
    console.error("❌ No se pudo iniciar el health endpoint:", error);
  });

  return server;
}
