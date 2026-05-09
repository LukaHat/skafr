import pluralize from "pluralize";
import { ResourceContext } from "./types";
import fs from "fs";
import path from "path";

const reservedKeywords = new Set([
  "class",
  "import",
  "export",
  "return",
  "function",
  "const",
  "let",
  "var",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "new",
  "delete",
  "typeof",
  "void",
  "in",
  "instanceof",
  "throw",
  "try",
  "catch",
  "finally",
  "default",
  "extends",
  "super",
  "this",
  "yield",
  "async",
  "await",
  "static",
  "type",
  "interface",
  "enum",
  "namespace",
  "abstract",
  "boolean",
  "byte",
  "char",
  "debugger",
  "double",
  "eval",
  "arguments",
  "final",
  "float",
  "goto",
  "int",
  "long",
  "native",
  "null",
  "private",
  "protected",
  "public",
  "package",
  "short",
  "synchronized",
  "throws",
  "true",
  "false",
  "with",
  "of",
  "as",
  "implements",
]);

const toPascalCase = (resourceName: string) =>
  resourceName
    .split(/(?=[A-Z])|[\s_-]/)
    .filter(Boolean)
    .map((word) => {
      const lowercasedWord = word.toLowerCase();
      return lowercasedWord.charAt(0).toUpperCase() + lowercasedWord.slice(1);
    })
    .join("");

const toCamelCase = (resourceName: string) => {
  const pascal = toPascalCase(resourceName);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
export const buildResourceContext = (resourceName: string) => {
  const normalized = resourceName.trim();
  if (!normalized) throw new Error("resource name must not be empty");

  const sanitized = normalized.replace(/[^a-zA-Z0-9\s_-]/g, "").trim();
  if (!sanitized)
    throw new Error("resourceName must contain alphanumeric characters");

  const isFirstCharDigit = /^[0-9]/.test(sanitized);
  if (isFirstCharDigit)
    throw new Error(
      "Resource name must start with a letter as a first character",
    );

  const reservedKeywordUsed = reservedKeywords.has(sanitized.toLowerCase());
  if (reservedKeywordUsed)
    throw new Error("Resource cannot use reserved JS keywords");

  return {
    resourceClass: toPascalCase(sanitized),
    resourceVar: toCamelCase(sanitized),
    resourceFile: sanitized.toLowerCase().replace(/\s+/g, "-"),
    //force pluralize with count 2
    resourceRoute: pluralize(sanitized.toLowerCase(), 2),
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
      (_, rawKey: keyof ResourceContext) => {
        if (!Object.prototype.hasOwnProperty.call(context, rawKey)) {
          throw new Error(`Unknown placeholder: ${rawKey}`);
        }
        return context[rawKey];
      },
    );

    fs.writeFileSync(outputPath, placeholdersReplaced, "utf-8");
  } catch (error) {
    throw new Error(
      `Error while rendering template: ${(error as Error).message}`,
    );
  }
};
