import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { SkafrConfig } from "../types";
import { buildResourceContext } from "../templateEngine";
import { getResourceFilePaths } from "./helper";
import { readRoutes, METHOD_ORDER } from "./routesReader";

const RESOURCES_START = "<!-- skafr:resources-start -->";
const RESOURCES_END = "<!-- skafr:resources-end -->";
const ROUTES_START = "<!-- skafr:routes-start -->";
const ROUTES_END = "<!-- skafr:routes-end -->";

const MISSING_SECTIONS_SUFFIX = `
## Generated Resources

${RESOURCES_START}
_No resources yet. Run \`skafr add <resource>\` to generate your first resource._
${RESOURCES_END}

## Registered Routes

${ROUTES_START}
_No routes yet._
${ROUTES_END}`;

const replaceBetween = (content: string, start: string, end: string, replacement: string) => {
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end);
  if (startIdx === -1 || endIdx === -1) return content;
  return content.slice(0, startIdx + start.length) + "\n" + replacement + "\n" + content.slice(endIdx);
};

const JSDOC_DESCRIPTION = /^\/\*\*\s*\n\s*\*\s*(.+?)\s*\n\s*\*\//m;

const extractDescription = (controllerPath: string): string => {
  if (!existsSync(controllerPath)) return "";
  const match = readFileSync(controllerPath, "utf-8").match(JSDOC_DESCRIPTION);
  return match ? match[1] : "";
};

const buildResourcesTable = (config: SkafrConfig): string => {
  const controllersDir = join(process.cwd(), config.srcDir, "controllers");
  if (!existsSync(controllersDir)) return "_No resources yet. Run `skafr add <resource>` to generate your first resource._";

  const controllerFiles = readdirSync(controllersDir)
    .filter((f) => f.endsWith("Controller.ts"))
    .sort();
  if (controllerFiles.length === 0) return "_No resources yet. Run `skafr add <resource>` to generate your first resource._";

  const check = (path: string) => (existsSync(path) ? "✓" : "✗");
  const rows = controllerFiles.map((file) => {
    const resourceFile = file.replace("Controller.ts", "");
    const paths = getResourceFilePaths(config, buildResourceContext(resourceFile));
    const description = extractDescription(paths.controllerPath);
    return `| ${resourceFile} | ${description} | ${check(paths.modelPath)} | ${check(paths.controllerPath)} | ${check(paths.repositoryPath)} | ${check(paths.routerPath)} | ${check(paths.validatorPath)} |`;
  });

  return [
    "| Resource | Description | Model | Controller | Repository | Router | Validator |",
    "|----------|-------------|-------|------------|------------|--------|-----------|",
    ...rows,
  ].join("\n");
};

const buildRoutesTable = (config: SkafrConfig): string => {
  const srcDir = join(process.cwd(), config.srcDir);
  const routes = readRoutes(srcDir);
  if (routes.length === 0) return "_No routes yet._";

  const sorted = [...routes].sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path);
    if (pathCmp !== 0) return pathCmp;
    return (METHOD_ORDER[a.method] ?? 99) - (METHOD_ORDER[b.method] ?? 99);
  });

  const rows = sorted.map((r) => `| ${r.method} | ${r.path} | ${r.handler} |`);
  return [
    "| Method | Path | Handler |",
    "|--------|------|---------|",
    ...rows,
  ].join("\n");
};

export const patchAgentsMd = (config: SkafrConfig): void => {
  const agentsPath = join(process.cwd(), "AGENTS.md");
  if (!existsSync(agentsPath)) return;

  let content = readFileSync(agentsPath, "utf-8");

  if (!content.includes(RESOURCES_START) || !content.includes(ROUTES_START)) {
    content = content.trimEnd() + MISSING_SECTIONS_SUFFIX + "\n";
  }

  content = replaceBetween(content, RESOURCES_START, RESOURCES_END, buildResourcesTable(config));
  content = replaceBetween(content, ROUTES_START, ROUTES_END, buildRoutesTable(config));
  writeFileSync(agentsPath, content);
};
