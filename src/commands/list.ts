import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { assertSkafrProject, loadConfig } from "../config";
import { buildResourceContext } from "../templateEngine";
import { getResourceFilePaths } from "../utils/helper";

const COL_W = 14;
const pad = (s: string) => s.padEnd(COL_W);
const check = (path: string) => (existsSync(path) ? "yes" : "-");

export const listCommand = (options: { json: boolean }) => {
  assertSkafrProject();

  const config = loadConfig();
  const controllersDir = join(config.srcDir, "controllers");

  if (!existsSync(controllersDir)) {
    if (options.json) {
      console.log(JSON.stringify({ resources: [] }, null, 2));
    } else {
      console.log("No resources found.");
    }
    return;
  }

  const controllerFiles = readdirSync(controllersDir).filter((f) =>
    f.endsWith("Controller.ts"),
  );

  if (controllerFiles.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ resources: [] }, null, 2));
    } else {
      console.log("No resources found.");
    }
    return;
  }

  const resources = controllerFiles.map((file) => {
    const resourceFile = file.replace("Controller.ts", "");
    const paths = getResourceFilePaths(config, buildResourceContext(resourceFile));
    return {
      name: resourceFile,
      files: {
        model:      { path: paths.modelPath,      exists: existsSync(paths.modelPath) },
        controller: { path: paths.controllerPath, exists: existsSync(paths.controllerPath) },
        repository: { path: paths.repositoryPath, exists: existsSync(paths.repositoryPath) },
        router:     { path: paths.routerPath,     exists: existsSync(paths.routerPath) },
        validator:  { path: paths.validatorPath,  exists: existsSync(paths.validatorPath) },
      },
    };
  });

  if (options.json) {
    console.log(JSON.stringify({ resources }, null, 2));
    return;
  }

  const cols = ["RESOURCE", "MODEL", "CONTROLLER", "REPOSITORY", "ROUTER", "VALIDATOR"];
  const separator = "─".repeat(cols.length * COL_W);

  console.log();
  console.log(cols.map(pad).join(""));
  console.log(separator);

  for (const resource of resources) {
    const row = [
      resource.name,
      check(resource.files.model.path),
      check(resource.files.controller.path),
      check(resource.files.repository.path),
      check(resource.files.router.path),
      check(resource.files.validator.path),
    ];
    console.log(row.map(pad).join(""));
  }

  console.log();
};
