import { existsSync, rmSync } from "fs";
import { confirm } from "@inquirer/prompts";
import { assertSkafrProject, loadConfig } from "../config";
import { buildResourceContext } from "../templateEngine";
import { buildResourceRegistration, getProjectPaths, getResourceFilePaths, patchFile } from "../utils/helper";
import { patchAgentsMd } from "../utils/agentsMdPatcher";

export const removeCommand = async (resource: string, options: { force: boolean }) => {
  try {
    assertSkafrProject();

    const config = loadConfig();
    const casingVariants = buildResourceContext(resource);

    const candidatePaths = Object.values(getResourceFilePaths(config, casingVariants));

    const filesToDelete = candidatePaths.filter(existsSync);

    if (filesToDelete.length === 0) {
      console.log(`No files found for resource '${resource}'. Nothing to remove.`);
      return;
    }

    if (!options.force) {
      if (!process.stdin.isTTY)
        throw new Error(
          `No TTY detected — use --force to skip confirmation in non-interactive mode.`
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

    const { apiRouter: apiRouterPath, types: typesPath, container: containerPath } = getProjectPaths(config);

    if (existsSync(apiRouterPath)) {
      const importLine = `import ${casingVariants.resourceVar}Router from './${casingVariants.resourceFile}Router'`;
      const useLine = `apiRouter.use('/${casingVariants.resourceRoute}', ${casingVariants.resourceVar}Router)`;
      patchFile(apiRouterPath, (lines) => lines.filter((l) => l !== importLine && l !== useLine));
      console.log(`Updated: ${apiRouterPath}`);
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
      patchFile(typesPath, (lines) =>
        lines.filter((l) => !l.includes(controllerSymbol) && !l.includes(repositorySymbol))
      );
    }

    if (existsSync(containerPath)) {
      patchFile(containerPath, (lines) =>
        lines.filter(
          (l) =>
            l !== controllerImport &&
            l !== repositoryImport &&
            l !== controllerBind &&
            l !== repositoryBind
        )
      );
    }

    try {
      patchAgentsMd(config);
    } catch (e) {
      console.warn(`Warning: could not update AGENTS.md — ${(e as Error).message}`);
    }
    console.log(`\nResource '${resource}' removed successfully.`);
  } catch (error) {
    throw new Error(`Failed to remove resource: ${(error as Error).message}`, { cause: error });
  }
};
