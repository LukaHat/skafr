import fs from "fs";
import path from "path";
import { SkafConfig } from "./types";

export const loadConfig = (): SkafConfig => {
  const configPath = path.join(process.cwd(), ".skafc");

  try {
    const rawConfig = fs.readFileSync(configPath, "utf-8");
    const parsedConfig = JSON.parse(rawConfig);

    if (!parsedConfig.stack || !parsedConfig.srcDir)
      throw new Error(
        'Invalid .skafc: missing required fields "stack" and "srcDir"',
      );
    return parsedConfig as SkafConfig;
  } catch (error) {
    if (error instanceof Error && (error as any).code === "ENOENT") {
      throw new Error(
        `.skafc file not found. Please either add .skafc config file or reference https://github.com/LukaHat/skaf for further instructions`,
      );
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        "Invalid JSON. Please check your .skafc file or reference https://github.com/LukaHat/skaf for further instructions",
      );
    }
    throw new Error(`Could not load .skaf config: ${(error as Error).message}`);
  }
};
