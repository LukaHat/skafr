import { AiFilesMode, InitOptions, SupportedOrms } from "../types";
import {
  mkdirSync,
  existsSync,
  writeFileSync,
  rmSync,
  readFileSync,
  symlinkSync,
} from "fs";
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
      "src/middlewares",
      "src/repositories",
      "src/utils",
      "src/di",
      "src/constants",
      "src/db/repositories",
    ];

    mkdirSync(join(cwd(), projectName));

    dirsToCreate.forEach((dir) => {
      mkdirSync(join(cwd(), projectName, dir), { recursive: true });
      console.log(`Directory '${dir}' created successfully!`);
    });

    writeFileSync(
      join(cwd(), projectName, ".skafrc"),
      JSON.stringify({ ...options, srcDir: "./src" }, null, 2),
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

    const apiRouter = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "routes",
        "apiRouter.ts.template",
      ),
      "utf-8",
    );
    writeFileSync(join(cwd(), projectName, "src", "routes", "apiRouter.ts"), apiRouter);

    const configTemplate = options.auth
      ? "config.ts.template"
      : "config.no-auth.ts.template";

    const config = readFileSync(
      join(__dirname, "..", "templates", "express", "init", configTemplate),
      "utf-8",
    );

    writeFileSync(join(cwd(), projectName, "src", "config.ts"), config);

    if (options.orm === SupportedOrms.sequelize) {
      const dbFile = readFileSync(
        join(__dirname, "..", "templates", "express", "init", "db.ts.template"),
        "utf-8",
      );
      writeFileSync(join(cwd(), projectName, "src", "db.ts"), dbFile);
    }

    const envTemplate = options.auth
      ? ".env.example.template"
      : ".env.no-auth.example.template";

    const envExample = readFileSync(
      join(__dirname, "..", "templates", "express", "init", envTemplate),
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

    const installResult = spawnSync("npm", ["install"], {
      cwd: join(cwd(), projectName),
      stdio: "inherit",
    });

    if (installResult.error || installResult.status !== 0)
      throw new Error(
        `npm install failed: ${installResult.error?.message ?? `exit code ${installResult.status}`}`,
      );

    const aiFilesMode = options.aiFiles ?? AiFilesMode.all;

    if (aiFilesMode === AiFilesMode.all || aiFilesMode === AiFilesMode.claude) {
      const agentsTemplate = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "init",
          "AGENTS.md.template",
        ),
        "utf-8",
      );

      writeFileSync(join(cwd(), projectName, "AGENTS.md"), agentsTemplate);
      symlinkSync("./AGENTS.md", join(cwd(), projectName, "CLAUDE.md"), "file");
    }

    if (aiFilesMode === AiFilesMode.all) {
      mkdirSync(join(cwd(), projectName, ".github"), { recursive: true });
      symlinkSync(
        "../AGENTS.md",
        join(cwd(), projectName, ".github", "copilot-instructions.md"),
        "file",
      );
    }

    if (aiFilesMode === AiFilesMode.copilot) {
      const copilotTemplate = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "init",
          "copilot-instructions.md.template",
        ),
        "utf-8",
      );

      mkdirSync(join(cwd(), projectName, ".github"), { recursive: true });
      writeFileSync(
        join(cwd(), projectName, ".github", "copilot-instructions.md"),
        copilotTemplate,
      );
    }

    const typesTemplate = options.auth
      ? "types.ts.template"
      : "types.no-auth.ts.template";

    const diTypesFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "di",
        typesTemplate,
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "di", "TYPES.ts"),
      diTypesFile,
    );

    const diContainerFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "di",
        "inversify.config.ts.template",
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "di", "inversify.config.ts"),
      diContainerFile,
    );

    const appConstantsFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "constants",
        "appConstants.ts.template",
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "constants", "appConstants.ts"),
      appConstantsFile,
    );

    const appStringsFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "constants",
        "appStrings.ts.template",
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "constants", "appStrings.ts"),
      appStringsFile,
    );

    const errorsFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "utils",
        "errors.ts.template",
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "utils", "errors.ts"),
      errorsFile,
    );

    const helpersFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "utils",
        "helpers.ts.template",
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "utils", "helpers.ts"),
      helpersFile,
    );

    const successResponsesFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "utils",
        "successResponses.ts.template",
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "utils", "successResponses.ts"),
      successResponsesFile,
    );

    const errorMiddlewareFile = readFileSync(
      join(
        __dirname,
        "..",
        "templates",
        "express",
        "init",
        "middlewares",
        "errorMiddleware.ts.template",
      ),
    );

    writeFileSync(
      join(cwd(), projectName, "src", "middlewares", "errorMiddleware.ts"),
      errorMiddlewareFile,
    );

    if (options.auth) {
      const typesFile = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "auth",
          "types.ts.template",
        ),
      );

      writeFileSync(join(cwd(), projectName, "src", "types.ts"), typesFile);

      const userModelFile = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "auth",
          "userModel.ts.template",
        ),
      );

      writeFileSync(
        join(cwd(), projectName, "src", "models", "userModel.ts"),
        userModelFile,
      );

      const authMiddlewareFile = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "auth",
          "authMiddleware.ts.template",
        ),
      );

      writeFileSync(
        join(cwd(), projectName, "src", "middlewares", "authMiddleware.ts"),
        authMiddlewareFile,
      );

      const userRepositoryFile = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "auth",
          "userRepository.ts.template",
        ),
      );

      writeFileSync(
        join(
          cwd(),
          projectName,
          "src",
          "db",
          "repositories",
          "userRepository.ts",
        ),
        userRepositoryFile,
      );

      const authControllerFile = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "auth",
          "authController.ts.template",
        ),
      );

      writeFileSync(
        join(cwd(), projectName, "src", "controllers", "authController.ts"),
        authControllerFile,
      );

      const authRouterFile = readFileSync(
        join(
          __dirname,
          "..",
          "templates",
          "express",
          "auth",
          "authRouter.ts.template",
        ),
      );

      writeFileSync(
        join(cwd(), projectName, "src", "routes", "authRouter.ts"),
        authRouterFile,
      );

      const apiRouterPath = join(cwd(), projectName, "src", "routes", "apiRouter.ts");
      const apiRouterContent = readFileSync(apiRouterPath, "utf-8");

      const importLine = `import authRouter from './authRouter'`;

      if (!apiRouterContent.includes(importLine)) {
        const lines = apiRouterContent.split("\n");

        const exportIndex = lines.findIndex((line) =>
          line.includes("export default apiRouter"),
        );

        lines.splice(exportIndex, 0, `apiRouter.use('/auth', authRouter)`);

        lines.splice(0, 0, importLine);

        writeFileSync(apiRouterPath, lines.join("\n"));
      }
    }
  } catch (error) {
    throw new Error(`Failed to scaffold project: ${(error as Error).message}`);
  }
};
