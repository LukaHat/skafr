import { existsSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { confirm } from "@inquirer/prompts";
import { assertSkafrProject, loadConfig } from "../config";
import { buildResourceContext } from "../templateEngine";

export const removeCommand = async (resource: string, options: { force: boolean }) => {
  try {
    assertSkafrProject();

    const config = loadConfig();
    const casingVariants = buildResourceContext(resource);
    const candidatePaths = [
      join(config.srcDir, "models", casingVariants.resourceFile + "Model.ts"),
      join(config.srcDir, "controllers", casingVariants.resourceFile + "Controller.ts"),
      join(config.srcDir, "repositories", casingVariants.resourceFile + "Repository.ts"),
      join(config.srcDir, "routes", casingVariants.resourceFile + "Router.ts"),
      join(config.srcDir, "validators", casingVariants.resourceFile + "Validator.ts"),
      join(config.srcDir, "__tests__", casingVariants.resourceFile + "Controller.test.ts"),
      join(config.srcDir, "__tests__", casingVariants.resourceFile + "Repository.test.ts"),
    ];

    const filesToDelete = candidatePaths.filter(existsSync);

    if (filesToDelete.length === 0) {
      console.log(`No files found for resource '${resource}'. Nothing to remove.`);
      return;
    }

    if (!options.force) {
      if (!process.stdin.isTTY)
        throw new Error(
          `No TTY detected — use --force to skip confirmation in non-interactive mode.`,
        );

      console.log("Files to remove:");
      filesToDelete.forEach((f) => console.log(`  ${f}`));

      const proceed = await confirm({
        message: `Remove ${filesToDelete.length} file(s) and de-register '${resource}' from apiRouter, TYPES, and inversify.config?`,
        default: false,
      });

      if (!proceed) {
        console.log("Aborted.");
        return;
      }
    }

    for (const fp of filesToDelete) {
      rmSync(fp);
      console.log(`Deleted: ${fp}`);
    }

    const apiRouterPath = join(config.srcDir, "routes", "apiRouter.ts");
    if (existsSync(apiRouterPath)) {
      const importLine = `import ${casingVariants.resourceVar}Router from './${casingVariants.resourceFile}Router'`;
      const useLine = `apiRouter.use('/${casingVariants.resourceRoute}', ${casingVariants.resourceVar}Router)`;
      const filtered = readFileSync(apiRouterPath, "utf-8")
        .split("\n")
        .filter((l) => l !== importLine && l !== useLine)
        .join("\n");
      writeFileSync(apiRouterPath, filtered);
      console.log(`Updated: ${apiRouterPath}`);
    }

    const typesPath = join(config.srcDir, "di", "TYPES.ts");
    if (existsSync(typesPath)) {
      const filtered = readFileSync(typesPath, "utf-8")
        .split("\n")
        .filter(
          (l) =>
            !l.includes(`${casingVariants.resourceClass}Controller: Symbol.for`) &&
            !l.includes(`${casingVariants.resourceClass}Repository: Symbol.for`),
        )
        .join("\n");
      writeFileSync(typesPath, filtered);
    }

    const containerPath = join(config.srcDir, "di", "inversify.config.ts");
    if (existsSync(containerPath)) {
      const controllerImport = `import { ${casingVariants.resourceClass}Controller } from "../controllers/${casingVariants.resourceFile}Controller"`;
      const repositoryImport = `import { ${casingVariants.resourceClass}Repository } from "../repositories/${casingVariants.resourceFile}Repository"`;
      const controllerBind = `container.bind<${casingVariants.resourceClass}Controller>(TYPES.${casingVariants.resourceClass}Controller).to(${casingVariants.resourceClass}Controller)`;
      const repositoryBind = `container.bind<${casingVariants.resourceClass}Repository>(TYPES.${casingVariants.resourceClass}Repository).to(${casingVariants.resourceClass}Repository)`;

      const filtered = readFileSync(containerPath, "utf-8")
        .split("\n")
        .filter(
          (l) =>
            l !== controllerImport &&
            l !== repositoryImport &&
            l !== controllerBind &&
            l !== repositoryBind,
        )
        .join("\n");
      writeFileSync(containerPath, filtered);
    }

    console.log(`\nResource '${resource}' removed successfully.`);
  } catch (error) {
    throw new Error(`Failed to remove resource: ${(error as Error).message}`, { cause: error });
  }
};
