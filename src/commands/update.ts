import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { confirm } from "@inquirer/prompts";
import { assertSkafrProject, loadConfig } from "../config";
import { SkafrError } from "../types";
import { getInitTemplatePath } from "../utils/helper";
import { version } from "../../package.json";

type UpdateEntry = { subPath: string[]; templateSegments: string[] };

const UPDATABLE_FILES: UpdateEntry[] = [
  { subPath: ["app.ts"],                           templateSegments: ["app.ts.template"] },
  { subPath: ["server.ts"],                        templateSegments: ["server.ts.template"] },
  { subPath: ["middlewares", "errorMiddleware.ts"], templateSegments: ["middlewares", "errorMiddleware.ts.template"] },
  { subPath: ["middlewares", "validateBody.ts"],    templateSegments: ["middlewares", "validateBody.ts.template"] },
  { subPath: ["utils", "errors.ts"],               templateSegments: ["utils", "errors.ts.template"] },
  { subPath: ["utils", "helpers.ts"],              templateSegments: ["utils", "helpers.ts.template"] },
  { subPath: ["utils", "successResponses.ts"],     templateSegments: ["utils", "successResponses.ts.template"] },
  { subPath: ["constants", "appConstants.ts"],     templateSegments: ["constants", "appConstants.ts.template"] },
];

export const updateCommand = async (options: { force: boolean; dryRun: boolean }) => {
  assertSkafrProject();
  const config = loadConfig();
  const srcDir = join(process.cwd(), config.srcDir);

  const candidates = UPDATABLE_FILES.map(({ subPath, templateSegments }) => {
    const targetPath = join(srcDir, ...subPath);
    const templatePath = getInitTemplatePath(...templateSegments);
    let templateContent: string;
    try {
      templateContent = readFileSync(templatePath, "utf-8");
    } catch {
      throw new SkafrError(
        `Bundled template not found: ${templatePath}`,
        "Your skafr installation may be corrupted — try reinstalling."
      );
    }
    const currentContent = existsSync(targetPath) ? readFileSync(targetPath, "utf-8") : null;
    return {
      label: join(config.srcDir, ...subPath),
      targetPath,
      templateContent,
      changed: currentContent !== templateContent,
      isNew: currentContent === null,
    };
  });

  const toUpdate = candidates.filter((c) => c.changed);

  if (options.dryRun) {
    if (toUpdate.length === 0) {
      console.log("All base files are up to date.");
      return;
    }
    console.log(`\n[dry-run] ${toUpdate.length} file(s) would be updated:\n`);
    for (const f of toUpdate) {
      console.log(`  ${f.label}${f.isNew ? " (new)" : ""}`);
    }
    console.log();
    return;
  }

  if (toUpdate.length === 0) {
    console.log("All base files are already up to date.");
    return;
  }

  if (!options.force && !process.stdin.isTTY) {
    throw new SkafrError(
      "No TTY detected — use --force to skip confirmation in non-interactive mode.",
      "Pass --force to update without prompts."
    );
  }

  const updated: string[] = [];

  for (const file of toUpdate) {
    if (!options.force) {
      const proceed = await confirm({ message: `Update ${file.label}?`, default: true });
      if (!proceed) {
        console.log(`Skipped: ${file.label}`);
        continue;
      }
    }
    mkdirSync(dirname(file.targetPath), { recursive: true });
    writeFileSync(file.targetPath, file.templateContent);
    console.log(`Updated: ${file.label}`);
    updated.push(file.label);
  }

  if (updated.length > 0) {
    const skafrcPath = join(process.cwd(), ".skafrc");
    const raw = JSON.parse(readFileSync(skafrcPath, "utf-8"));
    writeFileSync(skafrcPath, JSON.stringify({ ...raw, skafrVersion: version }, null, 2));
    console.log(`\n${updated.length} file(s) updated. skafr v${version} recorded in .skafrc.`);
  } else {
    console.log("\nNo files updated.");
  }
};
