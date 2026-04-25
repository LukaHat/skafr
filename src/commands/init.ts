import { InitOptions } from "../types";
import { mkdirSync, existsSync, writeFileSync, rmSync, readFileSync } from "fs";
import { confirm } from "@inquirer/prompts";
import { join } from "path";
import { cwd } from "process";
import { generatePackageJSON } from "../generators/initGenerator";
import { spawnSync } from "child_process";

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

    const packageJSONRaw = generatePackageJSON(projectName, options);

    writeFileSync(
      join(cwd(), projectName, "package.json"),
      JSON.stringify(packageJSONRaw, null, 2),
    );

    const app = readFileSync(
      join(__dirname, "..", "templates", "express", "init", "app.ts.template"),
      "utf-8",
    );

    writeFileSync(join(cwd(), projectName, "src", "app.ts"), app);

    const server = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "server.ts.template",
      ),
      "utf-8",
    );

    writeFileSync(join(cwd(), projectName, "src", "server.ts"), server);

    const config = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "config.ts.template",
      ),
      "utf-8",
    );

    writeFileSync(join(cwd(), projectName, "src", "config.ts"), config);

    const envExample = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        ".env.example.template",
      ),
      "utf-8",
    );

    writeFileSync(join(cwd(), projectName, ".env.example"), envExample);

    const tsConfig = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "tsconfig.json.template",
      ),
      "utf-8",
    );

    writeFileSync(join(cwd(), projectName, "tsconfig.json"), tsConfig);

    spawnSync("npm", ["install"], {
      cwd: join(cwd(), projectName),
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(`Failed to scaffold project: ${(error as Error).message}`);
  }
};
