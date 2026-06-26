import { AiFilesMode, InitOptions, SupportedDBs, SupportedOrms } from "../types";
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
import { getAuthTemplatePath, getInitTemplatePath, patchFile } from "../utils/helper";

export const initCommand = async (
  projectName: string,
  options: InitOptions,
) => {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName))
      throw new Error(
        "Invalid project name. Use only letters, numbers, hyphens, and underscores.",
      );

    if (options.orm === SupportedOrms.prisma && options.db === SupportedDBs.mongodb) {
      throw new Error("Prisma with MongoDB requires a separate setup. Use --orm mongoose --db mongodb instead.");
    }
    if (options.orm === SupportedOrms.sequelize && options.db === SupportedDBs.mongodb) {
      throw new Error("Sequelize does not support MongoDB. Use --orm mongoose --db mongodb.");
    }
    if (options.orm === SupportedOrms.mongoose && options.db !== SupportedDBs.mongodb) {
      throw new Error("Mongoose only supports MongoDB. Use --db mongodb or switch to a different ORM.");
    }

    const nonInteractive = options.yes || options.force || !process.stdin.isTTY;
    if (nonInteractive && !process.stdin.isTTY && !options.yes && !options.force) {
      console.warn("Warning: no TTY detected — running in non-interactive mode.");
    }

    if (options.dryRun) {
      console.log(`[dry-run] Would create project: ${projectName}/`);
      console.log("[dry-run] Directories:");
      const previewDirs = [
        "src/controllers", "src/routes", "src/models", "src/middlewares",
        "src/repositories", "src/utils", "src/di", "src/constants",
        "src/db/repositories", "src/validators", "src/__tests__",
      ];
      previewDirs.forEach((d) => console.log(`  ${d}/`));
      console.log("[dry-run] Files:");
      const previewFiles = [
        "package.json", "tsconfig.json", ".skafrc", ".env.example",
        "src/app.ts", "src/server.ts", "src/config.ts", "src/routes/apiRouter.ts",
        "src/di/TYPES.ts", "src/di/inversify.config.ts",
        "src/constants/appConstants.ts", "src/constants/appStrings.ts",
        "src/utils/errors.ts", "src/utils/helpers.ts", "src/utils/successResponses.ts",
        "src/middlewares/errorMiddleware.ts", "src/middlewares/validateBody.ts",
        ...(options.orm === SupportedOrms.sequelize || options.orm === SupportedOrms.mongoose || options.orm === SupportedOrms.prisma ? ["src/db.ts"] : []),
        ...(options.orm === SupportedOrms.prisma ? ["prisma/schema.prisma"] : []),
        ...(options.docker ? ["Dockerfile", "docker-compose.yml", ".dockerignore"] : []),
        ...(options.ci ? [".github/workflows/ci.yml"] : []),
      ];
      if (options.auth) {
        previewFiles.push(
          "src/types.ts",
          "src/models/userModel.ts",
          "src/middlewares/authMiddleware.ts",
          "src/db/repositories/userRepository.ts",
          "src/controllers/authController.ts",
          "src/routes/authRouter.ts",
        );
      }
      const aiMode = options.aiFiles ?? AiFilesMode.all;
      if (aiMode === AiFilesMode.all || aiMode === AiFilesMode.claude) {
        previewFiles.push("AGENTS.md", "CLAUDE.md -> AGENTS.md");
      }
      if (aiMode === AiFilesMode.all || aiMode === AiFilesMode.copilot) {
        previewFiles.push(".github/copilot-instructions.md");
      }
      previewFiles.forEach((f) => console.log(`  ${f}`));
      return;
    }

    const dirExists = existsSync(join(cwd(), projectName));
    if (dirExists && !nonInteractive) {
      const skafrConfigExists = existsSync(join(cwd(), projectName, ".skafrc"));
      const message = skafrConfigExists
        ? `skafr project already exists in '${projectName}'. Reinitialise? This will overwrite base files. (y/N)`
        : `Directory '${projectName}' already exists. Overwrite it?`;
      const overwrite = await confirm({ message, default: false });
      if (!overwrite) return;
    }
    if (dirExists) {
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
      "src/validators",
      "src/__tests__",
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

    const app = readFileSync(getInitTemplatePath("app.ts.template"), "utf-8");

    writeFileSync(join(cwd(), projectName, "src", "app.ts"), app);

    const server = readFileSync(getInitTemplatePath("server.ts.template"), "utf-8");

    writeFileSync(join(cwd(), projectName, "src", "server.ts"), server);

    const apiRouter = readFileSync(getInitTemplatePath("routes", "apiRouter.ts.template"), "utf-8");
    writeFileSync(join(cwd(), projectName, "src", "routes", "apiRouter.ts"), apiRouter);

    const configTemplate = options.auth
      ? "config.ts.template"
      : "config.no-auth.ts.template";

    const config = readFileSync(getInitTemplatePath(configTemplate), "utf-8");

    writeFileSync(join(cwd(), projectName, "src", "config.ts"), config);

    if (options.orm === SupportedOrms.sequelize) {
      const dbTemplateName = options.db === SupportedDBs.mysql
        ? "db.sequelize.mysql.ts.template"
        : "db.ts.template";
      const dbFile = readFileSync(getInitTemplatePath(dbTemplateName), "utf-8");
      writeFileSync(join(cwd(), projectName, "src", "db.ts"), dbFile);
    } else if (options.orm === SupportedOrms.mongoose) {
      const dbFile = readFileSync(getInitTemplatePath("db.mongoose.ts.template"), "utf-8");
      writeFileSync(join(cwd(), projectName, "src", "db.ts"), dbFile);
    } else if (options.orm === SupportedOrms.prisma) {
      const dbFile = readFileSync(getInitTemplatePath("db.prisma.ts.template"), "utf-8");
      writeFileSync(join(cwd(), projectName, "src", "db.ts"), dbFile);
      const schemaTemplateName = options.auth ? "schema.auth.prisma.template" : "schema.prisma.template";
      const rawSchema = readFileSync(getInitTemplatePath("prisma", schemaTemplateName), "utf-8");
      const targetProvider = options.db === SupportedDBs.mysql ? "mysql" : "postgresql";
      const schemaFile = rawSchema.replace(/provider\s*=\s*"postgresql"/, `provider = "${targetProvider}"`);
      if (targetProvider === "mysql" && schemaFile === rawSchema) {
        throw new Error("Failed to set Prisma provider to mysql — schema template may have changed.");
      }
      mkdirSync(join(cwd(), projectName, "prisma"), { recursive: true });
      writeFileSync(join(cwd(), projectName, "prisma", "schema.prisma"), schemaFile);
    }

    const envTemplate = options.auth
      ? ".env.example.template"
      : ".env.no-auth.example.template";

    const envExample = readFileSync(getInitTemplatePath(envTemplate), "utf-8");

    writeFileSync(join(cwd(), projectName, ".env.example"), envExample);

    const tsConfig = readFileSync(getInitTemplatePath("tsconfig.json.template"), "utf-8");

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
      const agentsTemplate = readFileSync(getInitTemplatePath("AGENTS.md.template"), "utf-8");

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
      const copilotTemplate = readFileSync(getInitTemplatePath("copilot-instructions.md.template"), "utf-8");

      mkdirSync(join(cwd(), projectName, ".github"), { recursive: true });
      writeFileSync(
        join(cwd(), projectName, ".github", "copilot-instructions.md"),
        copilotTemplate,
      );
    }

    const typesTemplate = options.auth
      ? "types.ts.template"
      : "types.no-auth.ts.template";

    const diTypesFile = readFileSync(getInitTemplatePath("di", typesTemplate));

    writeFileSync(
      join(cwd(), projectName, "src", "di", "TYPES.ts"),
      diTypesFile,
    );

    const diContainerFile = readFileSync(getInitTemplatePath("di", "inversify.config.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "di", "inversify.config.ts"),
      diContainerFile,
    );

    const appConstantsFile = readFileSync(getInitTemplatePath("constants", "appConstants.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "constants", "appConstants.ts"),
      appConstantsFile,
    );

    const appStringsFile = readFileSync(getInitTemplatePath("constants", "appStrings.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "constants", "appStrings.ts"),
      appStringsFile,
    );

    const errorsFile = readFileSync(getInitTemplatePath("utils", "errors.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "utils", "errors.ts"),
      errorsFile,
    );

    const helpersFile = readFileSync(getInitTemplatePath("utils", "helpers.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "utils", "helpers.ts"),
      helpersFile,
    );

    const successResponsesFile = readFileSync(getInitTemplatePath("utils", "successResponses.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "utils", "successResponses.ts"),
      successResponsesFile,
    );

    const errorMiddlewareFile = readFileSync(getInitTemplatePath("middlewares", "errorMiddleware.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "middlewares", "errorMiddleware.ts"),
      errorMiddlewareFile,
    );

    const validateBodyFile = readFileSync(getInitTemplatePath("middlewares", "validateBody.ts.template"));

    writeFileSync(
      join(cwd(), projectName, "src", "middlewares", "validateBody.ts"),
      validateBodyFile,
    );

    if (options.auth) {
      const typesFile = readFileSync(getAuthTemplatePath("types.ts.template"));

      writeFileSync(join(cwd(), projectName, "src", "types.ts"), typesFile);

      const userModelTemplateName = options.orm === SupportedOrms.mongoose
        ? "userModel.mongoose.ts.template"
        : options.orm === SupportedOrms.prisma
        ? "userModel.prisma.ts.template"
        : "userModel.ts.template";
      const userModelFile = readFileSync(getAuthTemplatePath(userModelTemplateName));

      writeFileSync(
        join(cwd(), projectName, "src", "models", "userModel.ts"),
        userModelFile,
      );

      const authMiddlewareFile = readFileSync(getAuthTemplatePath("authMiddleware.ts.template"));

      writeFileSync(
        join(cwd(), projectName, "src", "middlewares", "authMiddleware.ts"),
        authMiddlewareFile,
      );

      const userRepositoryTemplateName = options.orm === SupportedOrms.mongoose
        ? "userRepository.mongoose.ts.template"
        : options.orm === SupportedOrms.prisma
        ? "userRepository.prisma.ts.template"
        : "userRepository.ts.template";
      const userRepositoryFile = readFileSync(getAuthTemplatePath(userRepositoryTemplateName));

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

      const authControllerFile = readFileSync(getAuthTemplatePath("authController.ts.template"));

      writeFileSync(
        join(cwd(), projectName, "src", "controllers", "authController.ts"),
        authControllerFile,
      );

      const authRouterFile = readFileSync(getAuthTemplatePath("authRouter.ts.template"));

      writeFileSync(
        join(cwd(), projectName, "src", "routes", "authRouter.ts"),
        authRouterFile,
      );

      const apiRouterPath = join(cwd(), projectName, "src", "routes", "apiRouter.ts");
      const importLine = `import authRouter from './authRouter'`;

      if (!readFileSync(apiRouterPath, "utf-8").includes(importLine)) {
        patchFile(apiRouterPath, (lines) => {
          const exportIndex = lines.findIndex((line) => line.includes("export default apiRouter"));
          lines.splice(exportIndex, 0, `apiRouter.use('/auth', authRouter)`);
          lines.splice(0, 0, importLine);
          return lines;
        });
      }
    }

    if (options.docker) {
      const dockerfile = readFileSync(getInitTemplatePath("Dockerfile.template"), "utf-8");
      writeFileSync(join(cwd(), projectName, "Dockerfile"), dockerfile);

      const dockerCompose = readFileSync(getInitTemplatePath("docker-compose.yml.template"), "utf-8");
      writeFileSync(join(cwd(), projectName, "docker-compose.yml"), dockerCompose);

      const dockerignore = readFileSync(getInitTemplatePath(".dockerignore.template"), "utf-8");
      writeFileSync(join(cwd(), projectName, ".dockerignore"), dockerignore);
    }

    if (options.ci) {
      const ciWorkflow = readFileSync(getInitTemplatePath(".github", "workflows", "ci.yml.template"), "utf-8");
      mkdirSync(join(cwd(), projectName, ".github", "workflows"), { recursive: true });
      writeFileSync(join(cwd(), projectName, ".github", "workflows", "ci.yml"), ciWorkflow);
    }
  } catch (error) {
    throw new Error(`Failed to scaffold project: ${(error as Error).message}`, { cause: error });
  }
};
