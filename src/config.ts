import fs from "fs";
import path from "path";
import { SkafConfig, SupportedStacks } from "./types";

export const loadConfig = (): SkafConfig => {
  const configPath = path.join(process.cwd(), ".skafc");
  let parsedConfig: unknown;

  try {
    const rawConfig = fs.readFileSync(configPath, "utf-8");
    parsedConfig = JSON.parse(rawConfig);
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

  if (!isSkafConfig(parsedConfig))
    throw new Error(
      'Invalid .skafc: missing or invalid required fields "stack" and "srcDir". srcDir should be a path to your source directory and stack should be one of the supported stacks. Please check https://github.com/LukaHat/skaf',
    );
  return parsedConfig as SkafConfig;
};

const isSkafConfig = (objectToCheck: unknown): objectToCheck is SkafConfig => {
  const nonNullObject =
    typeof objectToCheck === "object" && objectToCheck !== null;
  if (nonNullObject) {
    const stackSupported =
      (objectToCheck as Record<string, unknown>) &&
      "stack" in objectToCheck &&
      Object.values(SupportedStacks).includes(
        objectToCheck.stack as SupportedStacks,
      );

    const containsSrcDir =
      (objectToCheck as Record<string, unknown>) &&
      "srcDir" in objectToCheck &&
      typeof objectToCheck.srcDir === "string";

    if (stackSupported && containsSrcDir) return true;
  }
  return false;
};
