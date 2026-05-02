import fs from "fs";
import path from "path";
import { SkafrConfig, SupportedStacks } from "./types";

export const loadConfig = (): SkafrConfig => {
  const configPath = path.join(process.cwd(), ".skafrc");
  let parsedConfig: unknown;

  try {
    const rawConfig = fs.readFileSync(configPath, "utf-8");
    parsedConfig = JSON.parse(rawConfig);
  } catch (error) {
    if (error instanceof Error && (error as any).code === "ENOENT") {
      throw new Error(
        `.skafrc file not found. Please either add .skafrc config file or reference https://github.com/LukaHat/skafr for further instructions`,
      );
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        "Invalid JSON. Please check your .skafrc file or reference https://github.com/LukaHat/skafr for further instructions",
      );
    }
    throw new Error(
      `Could not load .skafrc config: ${(error as Error).message}`,
    );
  }

  if (!isSkafrConfig(parsedConfig))
    throw new Error(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir". srcDir should be a path to your source directory and stack should be one of the supported stacks. Please check https://github.com/LukaHat/skafr',
    );
  return parsedConfig as SkafrConfig;
};

const isSkafrConfig = (
  objectToCheck: unknown,
): objectToCheck is SkafrConfig => {
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
      typeof objectToCheck.srcDir === "string" &&
      objectToCheck.srcDir.trim().length > 0;

    if (stackSupported && containsSrcDir) return true;
  }
  return false;
};
