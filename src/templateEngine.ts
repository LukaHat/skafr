import pluralize from "pluralize";
import { ResourceContext } from "./types";
import fs from "fs";
import path from "path";

const toPascalCase = (resourceName: string) =>
  resourceName
    .toLowerCase()
    .split(/[\s-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

const toCamelCase = (resourceName: string) => {
  const pascal = toPascalCase(resourceName);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
export const buildResourceContext = (resourceName: string) => {
  const normalized = resourceName.trim();

  return {
    resourceClass: toPascalCase(normalized),
    resourceVar: toCamelCase(normalized),
    resourceFile: normalized.toLowerCase().replace(/\s+/g, "-"),
    //force pluralize with count 2
    resourceRoute: pluralize(normalized.toLowerCase(), 2),
  };
};

export const renderTemplate = (
  template: string,
  context: ResourceContext,
  outputPath: string,
) => {
  try {
    fs.mkdirSync(path.dirname(outputPath), {
      recursive: true,
    });

    const placeholdersReplaced = template.replace(
      /{{\s*(\w+)\s*}}/g,
      (_, key: keyof ResourceContext) => {
        if (!(key in context)) {
          throw new Error(`Unknown placeholder: ${key}`);
        }
        return context[key];
      },
    );

    fs.writeFileSync(outputPath, placeholdersReplaced, "utf-8");
  } catch (error) {
    throw new Error(
      `Error while rendering template: ${(error as Error).message}`,
    );
  }
};
