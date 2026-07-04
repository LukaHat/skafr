import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type Route = {
  method: string;
  path: string;
  handler: string;
};

export const METHOD_ORDER: Record<string, number> = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };

const IMPORT_LINE = /import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/;
const API_ROUTER_USE = /apiRouter\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/;
const APP_MOUNT = /app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*apiRouter\s*\)/;
const ROUTER_VAR_DECL = /const\s+(\w+)\s*=\s*(?:express\.)?Router\s*\(/;
const ROUTE_HANDLER = /(\w+\.\w+)\s*\)\s*;?\s*$/;

const routeMethodPattern = (routerVar: string) =>
  new RegExp(`${routerVar}\\.(get|post|put|patch|delete)\\s*\\(\\s*['"]([^'"]+)['"]`, "i");

export const joinPath = (prefix: string, sub: string) => {
  const base = prefix.replace(/\/+$/, "");
  const tail = sub === "/" ? "" : sub.replace(/^\/+/, "/");
  return (base + tail) || "/";
};

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
  const ROUTE_LINE = routeMethodPattern(routerVar);

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

export const readRoutes = (srcDir: string): Route[] => {
  const apiRouterPath = join(srcDir, "routes", "apiRouter.ts");
  if (!existsSync(apiRouterPath)) return [];

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
    routes.push(...extractRoutesFromFile(filePath, varName, joinPath(appPrefix, routerPrefix)));
  }
  return routes;
};
