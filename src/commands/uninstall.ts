import { existsSync, rmSync } from "fs";
import { join } from "path";
import { cwd } from "process";

export const uninstallCommand = () => {
  const skafrcPath = join(cwd(), ".skafrc");

  if (existsSync(skafrcPath)) {
    try {
      rmSync(skafrcPath);
      console.log("Removed .skafrc");
    } catch {
      console.log("Something went wrong when deleting .skafrc");
    }
  } else {
    console.log("No .skafrc found in current directory.");
  }

  console.log("To remove the CLI globally, run: npm uninstall -g skafr");
};
