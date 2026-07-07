import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { assertSkafrProject, loadConfig } from "../config";
import { buildResourceContext } from "../templateEngine";
import { getProjectPaths, getResourceFilePaths } from "../utils/helper";
import { readRoutes, METHOD_ORDER } from "../utils/routesReader";
import { version } from "../../package.json";

const BIND_LINE = /container\.bind[^(]*\(TYPES\.(\w+)\)/;

const collectDiBindings = (containerPath: string): string[] => {
  if (!existsSync(containerPath)) return [];
  return readFileSync(containerPath, "utf-8")
    .split("\n")
    .flatMap((line) => {
      const match = line.match(BIND_LINE);
      return match ? [match[1]] : [];
    })
    .sort();
};

const collectResources = (config: ReturnType<typeof loadConfig>) => {
  const controllersDir = join(process.cwd(), config.srcDir, "controllers");
  if (!existsSync(controllersDir)) return [];
  return readdirSync(controllersDir)
    .filter((f) => f.endsWith("Controller.ts"))
    .sort()
    .map((file) => {
      const resourceFile = file.replace("Controller.ts", "");
      const paths = getResourceFilePaths(config, buildResourceContext(resourceFile));
      return {
        name: resourceFile,
        model: existsSync(paths.modelPath),
        controller: existsSync(paths.controllerPath),
        repository: existsSync(paths.repositoryPath),
        router: existsSync(paths.routerPath),
        validator: existsSync(paths.validatorPath),
      };
    });
};

export const contextCommand = (options: { json: boolean }) => {
  assertSkafrProject();
  const config = loadConfig();
  const srcDir = join(process.cwd(), config.srcDir);
  const { container: containerPath } = getProjectPaths(config);

  const resources = collectResources(config);
  const routes = [...readRoutes(srcDir)].sort((a, b) => {
    const p = a.path.localeCompare(b.path);
    return p !== 0 ? p : (METHOD_ORDER[a.method] ?? 99) - (METHOD_ORDER[b.method] ?? 99);
  });
  const diBindings = collectDiBindings(containerPath);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          version,
          config: {
            stack: config.stack,
            orm: config.orm ?? null,
            db: config.db ?? null,
            auth: config.auth ?? false,
            srcDir: config.srcDir,
          },
          resources,
          routes,
          diBindings,
        },
        null,
        2
      )
    );
    return;
  }

  const check = (v: boolean) => (v ? "✓" : "✗");
  const lines: string[] = [];

  lines.push("# Project Context\n");
  lines.push(`**skafr** ${version}  `);
  lines.push(
    `**Stack:** ${config.stack} | **ORM:** ${config.orm ?? "—"} | **DB:** ${config.db ?? "—"} | **Auth:** ${config.auth ? "yes" : "no"}\n`
  );

  lines.push(`## Resources (${resources.length})\n`);
  if (resources.length === 0) {
    lines.push("_No resources. Run `skafr add <resource>` to scaffold your first resource._\n");
  } else {
    lines.push("| Resource | Model | Controller | Repository | Router | Validator |");
    lines.push("|----------|-------|------------|------------|--------|-----------|");
    for (const r of resources) {
      lines.push(
        `| ${r.name} | ${check(r.model)} | ${check(r.controller)} | ${check(r.repository)} | ${check(r.router)} | ${check(r.validator)} |`
      );
    }
    lines.push("");
  }

  lines.push(`## Routes (${routes.length})\n`);
  if (routes.length === 0) {
    lines.push("_No routes registered._\n");
  } else {
    lines.push("| Method | Path | Handler |");
    lines.push("|--------|------|---------|");
    for (const r of routes) {
      lines.push(`| ${r.method} | ${r.path} | ${r.handler} |`);
    }
    lines.push("");
  }

  lines.push(`## DI Bindings (${diBindings.length})\n`);
  if (diBindings.length === 0) {
    lines.push("_No DI bindings found._\n");
  } else {
    for (const b of diBindings) {
      lines.push(`- ${b}`);
    }
    lines.push("");
  }

  console.log(lines.join("\n"));
};
