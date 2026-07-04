import { existsSync, readFileSync, writeFileSync, rmSync } from "fs";
import { assertSkafrProject, loadConfig } from "../config";
import { buildResourceContext, renderTemplate } from "../templateEngine";
import { migrationCommand } from "./migration";
import { SupportedOrms } from "../types";
import { select } from "@inquirer/prompts";
import { buildResourceRegistration, getProjectPaths, getResourceFilePaths, getResourceTemplatePath, patchFile } from "../utils/helper";
import { patchAgentsMd } from "../utils/agentsMdPatcher";

type ConflictAction = "overwrite" | "skip" | "abort";

type WrittenEntry = { path: string; wasNew: boolean; originalContent?: string };

const resolveConflict = async (
  filePath: string,
  options: { force: boolean; skipExisting: boolean },
  nonInteractive: boolean
): Promise<ConflictAction> => {
  if (options.force) return "overwrite";
  if (options.skipExisting) return "skip";
  if (nonInteractive)
    throw new Error(
      `File already exists: ${filePath}. Use --force to overwrite or --skip-existing to skip.`
    );

  return select<ConflictAction>({
    message: `File already exists: ${filePath}`,
    choices: [
      { value: "overwrite", name: "Overwrite" },
      { value: "skip", name: "Skip" },
      { value: "abort", name: "Abort" },
    ],
  });
};

const rollback = (written: WrittenEntry[]) => {
  for (const entry of [...written].reverse()) {
    try {
      if (entry.wasNew) {
        rmSync(entry.path, { force: true });
        console.error(`  Rolled back (deleted): ${entry.path}`);
      } else if (entry.originalContent !== undefined) {
        writeFileSync(entry.path, entry.originalContent);
        console.error(`  Rolled back (restored): ${entry.path}`);
      }
    } catch {
      console.error(`  Failed to roll back: ${entry.path}`);
    }
  }
};

const trackWrite = (path: string, written: WrittenEntry[], writeFn: () => void) => {
  const wasNew = !existsSync(path);
  const originalContent = wasNew ? undefined : readFileSync(path, "utf-8");
  writeFn();
  written.push({ path, wasNew, originalContent });
};

export const addCommand = async (
  resource: string,
  migrationName: string | undefined,
  options: { force: boolean; crud: boolean; skipExisting: boolean; tests: boolean; dryRun: boolean }
) => {
  if (resource === "migration") {
    if (!migrationName)
      throw new Error("Migration name required. Usage: skafr add migration <name>");
    migrationCommand(migrationName);
    return;
  }

  assertSkafrProject();
  const config = loadConfig();
  const casingVariants = buildResourceContext(resource);
  const written: WrittenEntry[] = [];

  try {
    const nonInteractive = !options.force && !options.skipExisting && !process.stdin.isTTY;

    const {
      modelPath,
      controllerPath,
      repositoryPath,
      routerPath,
      validatorPath,
      controllerTestPath,
      repositoryTestPath,
    } = getResourceFilePaths(config, casingVariants);

    const repositoryTemplateName = options.crud
      ? config.orm === SupportedOrms.sequelize
        ? "repository.crud.sequelize.ts.template"
        : config.orm === SupportedOrms.mongoose
        ? "repository.crud.mongoose.ts.template"
        : config.orm === SupportedOrms.prisma
        ? "repository.crud.prisma.ts.template"
        : "repository.crud.ts.template"
      : "repository.ts.template";

    const modelTemplateName = config.orm === SupportedOrms.mongoose
      ? "model.mongoose.ts.template"
      : config.orm === SupportedOrms.prisma
      ? "model.prisma.ts.template"
      : "model.ts.template";
    const modelTemplate = readFileSync(getResourceTemplatePath(modelTemplateName), "utf-8");
    const controllerTemplate = readFileSync(getResourceTemplatePath(options.crud ? "controller.crud.ts.template" : "controller.ts.template"), "utf-8");
    const repositoryTemplate = readFileSync(getResourceTemplatePath(repositoryTemplateName), "utf-8");
    const routerTemplate = readFileSync(getResourceTemplatePath("routes.ts.template"), "utf-8");
    const validatorTemplate = readFileSync(getResourceTemplatePath("validator.ts.template"), "utf-8");
    const controllerTestTemplate = readFileSync(getResourceTemplatePath("controller.test.ts.template"), "utf-8");
    const repositoryTestTemplate = readFileSync(getResourceTemplatePath("repository.test.ts.template"), "utf-8");

    const files = [
      { path: modelPath, template: modelTemplate },
      { path: controllerPath, template: controllerTemplate },
      { path: repositoryPath, template: repositoryTemplate },
      { path: routerPath, template: routerTemplate },
      { path: validatorPath, template: validatorTemplate },
      ...(options.tests
        ? [
            { path: controllerTestPath, template: controllerTestTemplate },
            { path: repositoryTestPath, template: repositoryTestTemplate },
          ]
        : []),
    ];

    if (options.dryRun) {
      console.log("[dry-run] Would generate:");
      for (const file of files) {
        console.log(`  ${file.path}`);
      }
      const { apiRouter: apiRouterPath } = getProjectPaths(config);
      const apiRouterContent = existsSync(apiRouterPath)
        ? readFileSync(apiRouterPath, "utf-8")
        : "";
      const importLine = `import ${casingVariants.resourceVar}Router from './${casingVariants.resourceFile}Router'`;
      if (!apiRouterContent.includes(importLine)) {
        console.log(`\n[dry-run] Would update ${apiRouterPath}:`);
        console.log(`  + ${importLine}`);
        console.log(
          `  + apiRouter.use('/${casingVariants.resourceRoute}', ${casingVariants.resourceVar}Router)`
        );
      }
      return;
    }

    const filesToWrite: typeof files = [];

    for (const file of files) {
      if (existsSync(file.path)) {
        const action = await resolveConflict(file.path, options, nonInteractive);
        if (action === "abort") {
          console.log("Aborted.");
          return;
        }
        if (action === "skip") {
          console.log(`Skipped: ${file.path}`);
          continue;
        }
        console.log(`Overwriting: ${file.path}`);
      }
      filesToWrite.push(file);
    }

    for (const file of filesToWrite) {
      trackWrite(file.path, written, () =>
        renderTemplate(file.template, casingVariants, file.path)
      );
    }

    const { apiRouter: apiRouterPath, types: typesPath, container: containerPath } = getProjectPaths(config);
    const apiRouterContent = readFileSync(apiRouterPath, "utf-8");
    const importLine = `import ${casingVariants.resourceVar}Router from './${casingVariants.resourceFile}Router'`;

    if (!apiRouterContent.includes(importLine)) {
      trackWrite(apiRouterPath, written, () => {
        patchFile(apiRouterPath, (lines) => {
          const exportIndex = lines.findIndex((line) => line.includes("export default apiRouter"));
          lines.splice(exportIndex, 0, `apiRouter.use('/${casingVariants.resourceRoute}', ${casingVariants.resourceVar}Router)`);
          lines.splice(0, 0, importLine);
          return lines;
        });
      });
    }

    const {
      controllerSymbol,
      repositorySymbol,
      controllerImport,
      repositoryImport,
      controllerBind,
      repositoryBind,
    } = buildResourceRegistration(casingVariants);

    if (existsSync(typesPath)) {
      const typesContent = readFileSync(typesPath, "utf-8");

      if (!typesContent.includes(`${casingVariants.resourceClass}Controller`)) {
        trackWrite(typesPath, written, () => {
          patchFile(typesPath, (lines) => {
            const closingIndex = lines.reduce<number>(
              (last, l, i) => (l.trim() === "};" ? i : last),
              -1
            );
            lines.splice(closingIndex, 0, controllerSymbol, repositorySymbol);
            return lines;
          });
        });
      }
    }

    if (existsSync(containerPath)) {
      const containerContent = readFileSync(containerPath, "utf-8");

      if (!containerContent.includes(controllerImport)) {
        trackWrite(containerPath, written, () => {
          patchFile(containerPath, (lines) => {
            const lastImportIndex = lines.reduce<number>(
              (last, line, i) => (line.startsWith("import ") ? i : last),
              -1
            );
            lines.splice(lastImportIndex + 1, 0, controllerImport, repositoryImport);
            const exportIndex = lines.findIndex((l) => l.includes("export default container"));
            lines.splice(exportIndex, 0, controllerBind, repositoryBind, "");
            return lines;
          });
        });
      }
    }
  } catch (error) {
    if (written.length > 0) {
      console.error("Generation failed. Rolling back:");
      rollback(written);
    }
    throw new Error(`Failed to generate resource: ${(error as Error).message}`, { cause: error });
  }

  try {
    patchAgentsMd(config);
  } catch (e) {
    console.warn(`Warning: could not update AGENTS.md — ${(e as Error).message}`);
  }
};
