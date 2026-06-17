import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { assertSkafrProject, loadConfig } from "../config";
import { buildResourceContext } from "../templateEngine";
import { getResourceFilePaths } from "../utils/helper";

const COL_W = 14;
const pad = (s: string) => s.padEnd(COL_W);
const check = (path: string) => (existsSync(path) ? "yes" : "-");

export const listCommand = () => {
  assertSkafrProject();

  const config = loadConfig();
  const controllersDir = join(config.srcDir, "controllers");

  if (!existsSync(controllersDir)) {
    console.log("No resources found.");
    return;
  }

  const controllerFiles = readdirSync(controllersDir).filter((f) =>
    f.endsWith("Controller.ts"),
  );

  if (controllerFiles.length === 0) {
    console.log("No resources found.");
    return;
  }

  const cols = ["RESOURCE", "MODEL", "CONTROLLER", "REPOSITORY", "ROUTER", "VALIDATOR"];
  const separator = "─".repeat(cols.length * COL_W);

  console.log();
  console.log(cols.map(pad).join(""));
  console.log(separator);

  for (const file of controllerFiles) {
    const resourceFile = file.replace("Controller.ts", "");
    const { modelPath, controllerPath, repositoryPath, routerPath, validatorPath } =
      getResourceFilePaths(config, buildResourceContext(resourceFile));
    const row = [
      resourceFile,
      check(modelPath),
      check(controllerPath),
      check(repositoryPath),
      check(routerPath),
      check(validatorPath),
    ];
    console.log(row.map(pad).join(""));
  }

  console.log();
};
