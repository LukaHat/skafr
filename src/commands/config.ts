import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";
import { input, select, confirm } from "@inquirer/prompts";
import { SupportedStacks, SupportedOrms, SupportedDBs } from "../types";

type SkafrcShape = {
  stack: string;
  srcDir: string;
  orm: string;
  db: string;
  auth: boolean;
};

const readExisting = (): Partial<SkafrcShape> => {
  const configPath = join(cwd(), ".skafrc");
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as Partial<SkafrcShape>;
  } catch {
    return {};
  }
};

export const configCommand = async () => {
  try {
    const configPath = join(cwd(), ".skafrc");
    const existing = readExisting();
    const hasExisting = existsSync(configPath);

    if (hasExisting) {
      console.log(`Found existing .skafrc. Current values will be used as defaults.`);
    }

    const stack = await select({
      message: "Stack",
      choices: Object.values(SupportedStacks).map((v) => ({ value: v, name: v })),
      default: (existing.stack as SupportedStacks) ?? SupportedStacks.express,
    });

    const orm = await select({
      message: "ORM",
      choices: Object.values(SupportedOrms).map((v) => ({ value: v, name: v })),
      default: (existing.orm as SupportedOrms) ?? SupportedOrms.sequelize,
    });

    const db = await select({
      message: "Database",
      choices: Object.values(SupportedDBs).map((v) => ({ value: v, name: v })),
      default: (existing.db as SupportedDBs) ?? SupportedDBs.postgres,
    });

    const auth = await confirm({
      message: "Include auth?",
      default: existing.auth ?? true,
    });

    const srcDir = await input({
      message: "Source directory",
      default: existing.srcDir ?? "./src",
    });

    const config = { stack, orm, db, auth, srcDir };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n.skafrc ${hasExisting ? "updated" : "created"} successfully.`);
  } catch (error) {
    throw new Error(`Failed to configure project: ${(error as Error).message}`, { cause: error });
  }
};
