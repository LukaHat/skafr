import { existsSync, rmSync } from "fs";
import { join } from "path";
import { cwd } from "process";

export const uninstallCommand = () => {
  const skafrcPath = join(cwd(), ".skafrc");

  if (existsSync(skafrcPath)) {
    rmSync(skafrcPath);
    console.log("Removed .skafrc");
  } else {
    console.log("No .skafrc found in current directory.");
  }

  console.log("To remove the CLI globally, run: npm uninstall -g skaf");
};
