import { existsSync } from "fs";
import { join } from "path";
import { assertSkafrProject, loadConfig } from "../config";
import { readRoutes, METHOD_ORDER } from "../utils/routesReader";

export const routesCommand = (options: { json: boolean }) => {
  assertSkafrProject();
  const config = loadConfig();

  const srcDir = join(process.cwd(), config.srcDir);

  if (!existsSync(join(srcDir, "routes", "apiRouter.ts"))) {
    console.error("src/routes/apiRouter.ts not found.");
    process.exit(1);
  }

  const routes = readRoutes(srcDir);

  if (options.json) {
    console.log(JSON.stringify({ routes }, null, 2));
    return;
  }

  if (routes.length === 0) {
    console.log("No routes registered.");
    return;
  }

  const sorted = [...routes].sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path);
    if (pathCmp !== 0) return pathCmp;
    return (METHOD_ORDER[a.method] ?? 99) - (METHOD_ORDER[b.method] ?? 99);
  });

  const METHOD_W = 9;
  const PATH_W = Math.max(40, ...sorted.map((r) => r.path.length + 2));

  console.log(`\n${"METHOD".padEnd(METHOD_W)}${"PATH".padEnd(PATH_W)}HANDLER`);
  console.log("─".repeat(METHOD_W + PATH_W + 30));
  for (const route of sorted) {
    console.log(`${route.method.padEnd(METHOD_W)}${route.path.padEnd(PATH_W)}${route.handler}`);
  }
  console.log();
};
