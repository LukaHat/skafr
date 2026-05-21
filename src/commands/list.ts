import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { assertSkafrProject, loadConfig } from "../config";

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
    const r = file.replace("Controller.ts", "");
    const row = [
      r,
      check(join(config.srcDir, "models", r + "Model.ts")),
      check(join(config.srcDir, "controllers", r + "Controller.ts")),
      check(join(config.srcDir, "repositories", r + "Repository.ts")),
      check(join(config.srcDir, "routes", r + "Router.ts")),
      check(join(config.srcDir, "validators", r + "Validator.ts")),
    ];
    console.log(row.map(pad).join(""));
  }

  console.log();
};
