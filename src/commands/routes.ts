import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { assertSkafrProject, loadConfig } from "../config";

type Route = {
  method: string;
  path: string;
  handler: string;
};

const METHOD_ORDER: Record<string, number> = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };

const IMPORT_LINE = /import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/;
const API_ROUTER_USE = /apiRouter\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/;
const APP_MOUNT = /app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*apiRouter\s*\)/;
const ROUTER_VAR_DECL = /const\s+(\w+)\s*=\s*(?:express\.)?Router\s*\(/;
const ROUTE_HANDLER = /(\w+\.\w+)\s*\)\s*;?\s*$/;

const routeMethod = (routerVar: string) =>
  new RegExp(`${routerVar}\\.(get|post|put|patch|delete)\\s*\\(\\s*['"]([^'"]+)['"]`, "i");

const joinPath = (prefix: string, sub: string) =>
  (prefix + (sub === "/" ? "" : sub)) || "/";

const resolveAppPrefix = (appPath: string): string => {
  if (!existsSync(appPath)) return "/api";
  const match = readFileSync(appPath, "utf-8").match(APP_MOUNT);
  return match ? match[1] : "/api";
};

const parseRouterVar = (lines: string[]): string | null => {
  for (const line of lines) {
    const match = line.match(ROUTER_VAR_DECL);
    if (match) return match[1];
  }
  return null;
};

const extractRoutesFromFile = (filePath: string, varFallback: string, prefix: string): Route[] => {
  if (!existsSync(filePath)) return [];

  const lines = readFileSync(filePath, "utf-8").split("\n");
  const routerVar = parseRouterVar(lines) ?? varFallback;
  const ROUTE_LINE = routeMethod(routerVar);

  return lines.flatMap((line) => {
    const route = line.match(ROUTE_LINE);
    if (!route) return [];
    const handler = line.match(ROUTE_HANDLER);
    return [{
      method: route[1].toUpperCase(),
      path: joinPath(prefix, route[2]),
      handler: handler ? handler[1] : "—",
    }];
  });
};

export const routesCommand = (options: { json: boolean }) => {
  assertSkafrProject();
  const config = loadConfig();

  const srcDir = join(process.cwd(), config.srcDir);
  const apiRouterPath = join(srcDir, "routes", "apiRouter.ts");

  if (!existsSync(apiRouterPath)) {
    console.error("src/routes/apiRouter.ts not found.");
    process.exit(1);
  }

  const appPrefix = resolveAppPrefix(join(srcDir, "app.ts"));
  const apiRouterLines = readFileSync(apiRouterPath, "utf-8").split("\n");

  const importedFiles: Record<string, string> = {};
  const mountedRouters: Record<string, string> = {};

  for (const line of apiRouterLines) {
    const imp = line.match(IMPORT_LINE);
    if (imp) importedFiles[imp[1]] = imp[2];

    const use = line.match(API_ROUTER_USE);
    if (use) mountedRouters[use[2]] = use[1];
  }

  const routes: Route[] = [];

  for (const [varName, routerPrefix] of Object.entries(mountedRouters)) {
    const fileName = importedFiles[varName];
    if (!fileName) continue;
    const filePath = join(srcDir, "routes", `${fileName}.ts`);
    routes.push(...extractRoutesFromFile(filePath, varName, appPrefix + routerPrefix));
  }

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
