import { readdir, readFile, writeFile, stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixImports(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await fixImports(fullPath);
    } else if (entry.name.endsWith(".js")) {
      let content = await readFile(fullPath, "utf-8");
      let modified = false;

      // Reemplazar importaciones relativas sin extensión
      // Patrón: from "./algo" o from "../algo" (pero no "./algo.js" o "./algo.json")
      content = content.replace(
        /from\s+['"](\.\.?\/[^'"]+)(?<!\.js)(?<!\.json)['"]/g,
        (match, path) => {
          modified = true;
          return match.replace(path, path + ".js");
        }
      );

      // También para import() dinámicos
      content = content.replace(
        /import\s*\(\s*['"](\.\.?\/[^'"]+)(?<!\.js)(?<!\.json)['"]/g,
        (match, path) => {
          modified = true;
          return match.replace(path, path + ".js");
        }
      );

      if (modified) {
        await writeFile(fullPath, content, "utf-8");
        console.log(`Fixed: ${fullPath}`);
      }
    }
  }
}

const distDir = join(__dirname, "../dist");
fixImports(distDir)
  .then(() => {
    console.log("✅ Import fixes applied");
  })
  .catch((error) => {
    console.error("❌ Error fixing imports:", error);
    process.exit(1);
  });
