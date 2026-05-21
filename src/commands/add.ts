import { existsSync, readFileSync, writeFileSync } from "fs";
import { assertSkafrProject, loadConfig } from "../config";
import { buildResourceContext, renderTemplate } from "../templateEngine";
import { SupportedOrms } from "../types";
import { join } from "path";
import { select } from "@inquirer/prompts";

type ConflictAction = "overwrite" | "skip" | "abort";

const resolveConflict = async (
  filePath: string,
  options: { force: boolean; skipExisting: boolean },
  nonInteractive: boolean,
): Promise<ConflictAction> => {
  if (options.force) return "overwrite";
  if (options.skipExisting) return "skip";
  if (nonInteractive)
    throw new Error(
      `File already exists: ${filePath}. Use --force to overwrite or --skip-existing to skip.`,
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

export const addCommand = async (
  resource: string,
  options: { force: boolean; crud: boolean; skipExisting: boolean; tests: boolean; dryRun: boolean },
) => {
  try {
    assertSkafrProject();

    const config = loadConfig();
    const casingVariants = buildResourceContext(resource);
    const nonInteractive = !options.force && !options.skipExisting && !process.stdin.isTTY;

    const modelPath = join(config.srcDir, "models", casingVariants.resourceFile + "Model.ts");
    const controllerPath = join(
      config.srcDir,
      "controllers",
      casingVariants.resourceFile + "Controller.ts",
    );
    const repositoryPath = join(
      config.srcDir,
      "repositories",
      casingVariants.resourceFile + "Repository.ts",
    );
    const routerPath = join(config.srcDir, "routes", casingVariants.resourceFile + "Router.ts");
    const validatorPath = join(
      config.srcDir,
      "validators",
      casingVariants.resourceFile + "Validator.ts",
    );
    const controllerTestPath = join(
      config.srcDir,
      "__tests__",
      casingVariants.resourceFile + "Controller.test.ts",
    );
    const repositoryTestPath = join(
      config.srcDir,
      "__tests__",
      casingVariants.resourceFile + "Repository.test.ts",
    );

    const modelTemplate = readFileSync(
      join(__dirname, "..", "templates", "express", "resources", "model.ts.template"),
      "utf-8",
    );
    const controllerTemplate = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "resources",
        options.crud ? "controller.crud.ts.template" : "controller.ts.template",
      ),
      "utf-8",
    );
    const repositoryTemplateName = options.crud
      ? config.orm === SupportedOrms.sequelize
        ? "repository.crud.sequelize.ts.template"
        : "repository.crud.ts.template"
      : "repository.ts.template";

    const repositoryTemplate = readFileSync(
      join(__dirname, "..", "templates", "express", "resources", repositoryTemplateName),
      "utf-8",
    );
    const routerTemplate = readFileSync(
      join(__dirname, "..", "templates", "express", "resources", "routes.ts.template"),
      "utf-8",
    );
    const validatorTemplate = readFileSync(
      join(__dirname, "..", "templates", "express", "resources", "validator.ts.template"),
      "utf-8",
    );
    const controllerTestTemplate = readFileSync(
      join(__dirname, "..", "templates", "express", "resources", "controller.test.ts.template"),
      "utf-8",
    );
    const repositoryTestTemplate = readFileSync(
      join(__dirname, "..", "templates", "express", "resources", "repository.test.ts.template"),
      "utf-8",
    );

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
      const apiRouterPath = join(config.srcDir, "routes", "apiRouter.ts");
      const apiRouterContent = existsSync(apiRouterPath)
        ? readFileSync(apiRouterPath, "utf-8")
        : "";
      const importLine = `import ${casingVariants.resourceVar}Router from './${casingVariants.resourceFile}Router'`;
      if (!apiRouterContent.includes(importLine)) {
        console.log(`\n[dry-run] Would update ${apiRouterPath}:`);
        console.log(`  + ${importLine}`);
        console.log(`  + apiRouter.use('/${casingVariants.resourceRoute}', ${casingVariants.resourceVar}Router)`);
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
      renderTemplate(file.template, casingVariants, file.path);
    }

    const apiRouterPath = join(config.srcDir, "routes", "apiRouter.ts");
    const apiRouterContent = readFileSync(apiRouterPath, "utf-8");

    const importLine = `import ${casingVariants.resourceVar}Router from './${casingVariants.resourceFile}Router'`;

    if (!apiRouterContent.includes(importLine)) {
      const lines = apiRouterContent.split("\n");
      const exportIndex = lines.findIndex((line) => line.includes("export default apiRouter"));

      lines.splice(
        exportIndex,
        0,
        `apiRouter.use('/${casingVariants.resourceRoute}', ${casingVariants.resourceVar}Router)`,
      );

      lines.splice(0, 0, importLine);

      writeFileSync(apiRouterPath, lines.join("\n"));
    }

    const typesPath = join(config.srcDir, "di", "TYPES.ts");
    if (existsSync(typesPath)) {
      const typesContent = readFileSync(typesPath, "utf-8");
      const controllerSymbol = `  ${casingVariants.resourceClass}Controller: Symbol.for("${casingVariants.resourceClass}Controller"),`;
      const repositorySymbol = `  ${casingVariants.resourceClass}Repository: Symbol.for("${casingVariants.resourceClass}Repository"),`;

      if (!typesContent.includes(`${casingVariants.resourceClass}Controller`)) {
        const lines = typesContent.split("\n");
        const closingIndex = lines.reduce<number>((last, l, i) => (l.trim() === "};" ? i : last), -1);
        lines.splice(closingIndex, 0, controllerSymbol, repositorySymbol);
        writeFileSync(typesPath, lines.join("\n"));
      }
    }

    const containerPath = join(config.srcDir, "di", "inversify.config.ts");
    if (existsSync(containerPath)) {
      const containerContent = readFileSync(containerPath, "utf-8");
      const controllerImport = `import { ${casingVariants.resourceClass}Controller } from "../controllers/${casingVariants.resourceFile}Controller"`;
      const repositoryImport = `import { ${casingVariants.resourceClass}Repository } from "../repositories/${casingVariants.resourceFile}Repository"`;
      const controllerBind = `container.bind<${casingVariants.resourceClass}Controller>(TYPES.${casingVariants.resourceClass}Controller).to(${casingVariants.resourceClass}Controller)`;
      const repositoryBind = `container.bind<${casingVariants.resourceClass}Repository>(TYPES.${casingVariants.resourceClass}Repository).to(${casingVariants.resourceClass}Repository)`;

      if (!containerContent.includes(controllerImport)) {
        const lines = containerContent.split("\n");

        const lastImportIndex = lines.reduce<number>(
          (last, line, i) => (line.startsWith("import ") ? i : last),
          -1,
        );
        lines.splice(lastImportIndex + 1, 0, controllerImport, repositoryImport);

        const exportIndex = lines.findIndex((l) => l.includes("export default container"));
        lines.splice(exportIndex, 0, controllerBind, repositoryBind, "");

        writeFileSync(containerPath, lines.join("\n"));
      }
    }
  } catch (error) {
    throw new Error(`Failed to generate resource: ${(error as Error).message}`, { cause: error });
  }
};
