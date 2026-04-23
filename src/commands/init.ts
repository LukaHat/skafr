import { InitOptions } from "../types";
import { mkdirSync, existsSync, writeFileSync, rmSync } from "fs";
import { confirm } from "@inquirer/prompts";
import { join } from "path";
import { cwd } from "process";

export const initCommand = async (
  projectName: string,
  options: InitOptions,
) => {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName))
      throw new Error(
        "Invalid project name. Use only letters, numbers, hyphens, and underscores.",
      );

    const dirExists = existsSync(join(cwd(), projectName));
    if (dirExists) {
      const overwriteDir = await confirm({
        message: `Looks like a directory named ${projectName} already exists. Do you want to overwrite it?`,
      });
      if (!overwriteDir) return;
      rmSync(join(cwd(), projectName), { recursive: true, force: true });
    }

    const dirsToCreate = [
      "src/controllers",
      "src/routes",
      "src/models",
      "src/middleware",
      "src/repositories",
    ];

    mkdirSync(join(cwd(), projectName));

    dirsToCreate.forEach((dir) => {
      mkdirSync(join(cwd(), projectName, dir), { recursive: true });
      console.log(`Directory '${dir}' created successfully!`);
    });

    writeFileSync(
      join(cwd(), projectName, ".skafc"),
      JSON.stringify(options, null, 2),
    );
  } catch (error) {
    throw new Error(`Failed to scaffold project: ${(error as Error).message}`);
  }
};
