import { join } from "path";
import { ResourceContext, SkafrConfig } from "../types";
import { readFileSync, writeFileSync } from "fs";

const TEMPLATES_ROOT = join(__dirname, "..", "..", "templates", "express");

export const getInitTemplatePath = (...segments: string[]) => join(TEMPLATES_ROOT, "init", ...segments);
export const getAuthTemplatePath = (...segments: string[]) => join(TEMPLATES_ROOT, "auth", ...segments);
export const getResourceTemplatePath = (filename: string) => join(TEMPLATES_ROOT, "resources", filename);

export const getResourceFilePaths = (config: SkafrConfig, casingVariants: ResourceContext) => {
  const modelPath = join(config.srcDir, "models", casingVariants.resourceFile + "Model.ts");
  const controllerPath = join(
    config.srcDir,
    "controllers",
    casingVariants.resourceFile + "Controller.ts"
  );
  const repositoryPath = join(
    config.srcDir,
    "repositories",
    casingVariants.resourceFile + "Repository.ts"
  );
  const routerPath = join(config.srcDir, "routes", casingVariants.resourceFile + "Router.ts");
  const validatorPath = join(
    config.srcDir,
    "validators",
    casingVariants.resourceFile + "Validator.ts"
  );
  const controllerTestPath = join(
    config.srcDir,
    "__tests__",
    casingVariants.resourceFile + "Controller.test.ts"
  );
  const repositoryTestPath = join(
    config.srcDir,
    "__tests__",
    casingVariants.resourceFile + "Repository.test.ts"
  );

  return {
    modelPath,
    controllerPath,
    repositoryPath,
    routerPath,
    validatorPath,
    controllerTestPath,
    repositoryTestPath,
  };
};

export const buildResourceRegistration = (casingVariants: ResourceContext) => {
  const controllerSymbol = `  ${casingVariants.resourceClass}Controller: Symbol.for("${casingVariants.resourceClass}Controller"),`;
  const repositorySymbol = `  ${casingVariants.resourceClass}Repository: Symbol.for("${casingVariants.resourceClass}Repository"),`;
  const controllerImport = `import { ${casingVariants.resourceClass}Controller } from "../controllers/${casingVariants.resourceFile}Controller"`;
  const repositoryImport = `import { ${casingVariants.resourceClass}Repository } from "../repositories/${casingVariants.resourceFile}Repository"`;
  const controllerBind = `container.bind<${casingVariants.resourceClass}Controller>(TYPES.${casingVariants.resourceClass}Controller).to(${casingVariants.resourceClass}Controller)`;
  const repositoryBind = `container.bind<${casingVariants.resourceClass}Repository>(TYPES.${casingVariants.resourceClass}Repository).to(${casingVariants.resourceClass}Repository)`;

  return {
    controllerSymbol,
    repositorySymbol,
    controllerImport,
    repositoryImport,
    controllerBind,
    repositoryBind,
  };
};

export const getProjectPaths = (config: SkafrConfig) => ({
  apiRouter: join(config.srcDir, "routes", "apiRouter.ts"),
  types: join(config.srcDir, "di", "TYPES.ts"),
  container: join(config.srcDir, "di", "inversify.config.ts"),
});

export const patchFile = (filePath: string, transform: (lines: string[]) => string[]) => {
  const content = readFileSync(filePath, "utf-8");
  writeFileSync(filePath, transform(content.split("\n")).join("\n"));
};
