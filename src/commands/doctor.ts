import { existsSync } from "fs";
import { join } from "path";
import { loadConfig } from "../config";
import { SupportedDBs, SupportedOrms } from "../types";

type CheckStatus = "pass" | "warn" | "fail";
type Check = { name: string; status: CheckStatus; message: string };

const pass = (name: string, message: string): Check => ({ name, status: "pass", message });
const warn = (name: string, message: string): Check => ({ name, status: "warn", message });
const fail = (name: string, message: string): Check => ({ name, status: "fail", message });

const worstStatus = (checks: Check[]): CheckStatus => {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
};

export const doctorCommand = (options: { json: boolean }) => {
  const checks: Check[] = [];

  const skafrcPath = join(process.cwd(), ".skafrc");
  if (!existsSync(skafrcPath)) {
    checks.push(fail("skafrc", ".skafrc not found — run `skafr init` first"));
    return output(checks, options.json);
  }

  let config: ReturnType<typeof loadConfig> | null = null;
  try {
    config = loadConfig();
    checks.push(pass("skafrc", "Found and valid"));
  } catch (e) {
    checks.push(fail("skafrc", (e as Error).message));
    return output(checks, options.json);
  }

  const orm = config.orm;
  const db = config.db;

  if (!orm) {
    checks.push(warn("orm_db_combo", "orm not set in .skafrc — run `skafr config` to configure"));
  } else if (orm === SupportedOrms.prisma && db === SupportedDBs.mongodb) {
    checks.push(fail("orm_db_combo", "prisma + mongodb is not supported — use --orm mongoose --db mongodb"));
  } else {
    checks.push(pass("orm_db_combo", `${orm} + ${db ?? "postgres"} is valid`));
  }

  const nodeModulesPath = join(process.cwd(), "node_modules");
  if (!existsSync(nodeModulesPath)) {
    checks.push(warn("dependencies", "node_modules not found — run `npm install`"));
  } else {
    checks.push(pass("dependencies", "node_modules found"));

    if (orm === SupportedOrms.sequelize) {
      const installed = existsSync(join(nodeModulesPath, "sequelize"));
      checks.push(installed
        ? pass("orm_package", "sequelize installed")
        : warn("orm_package", "sequelize not found in node_modules — run `npm install`"));
    } else if (orm === SupportedOrms.mongoose) {
      const installed = existsSync(join(nodeModulesPath, "mongoose"));
      checks.push(installed
        ? pass("orm_package", "mongoose installed")
        : warn("orm_package", "mongoose not found in node_modules — run `npm install`"));
    } else if (orm === SupportedOrms.prisma) {
      const installed = existsSync(join(nodeModulesPath, "@prisma", "client"));
      checks.push(installed
        ? pass("orm_package", "@prisma/client installed")
        : warn("orm_package", "@prisma/client not found in node_modules — run `npm install`"));
    }
  }

  const srcDir = join(process.cwd(), config.srcDir);
  if (!existsSync(srcDir)) {
    checks.push(fail("src_dir", `${config.srcDir} does not exist`));
  } else {
    checks.push(pass("src_dir", `${config.srcDir} exists`));

    const coreDirs = ["controllers", "models", "repositories", "routes", "validators", "di"];
    const missingDirs = coreDirs.filter((d) => !existsSync(join(srcDir, d)));
    if (missingDirs.length > 0) {
      checks.push(warn("core_dirs", `Missing directories: ${missingDirs.join(", ")}`));
    } else {
      checks.push(pass("core_dirs", "All core directories present"));
    }

    const diFiles = [join(srcDir, "di", "TYPES.ts"), join(srcDir, "di", "inversify.config.ts")];
    const missingDi = diFiles.filter((f) => !existsSync(f)).map((f) => f.replace(srcDir + "/", ""));
    if (missingDi.length > 0) {
      checks.push(warn("di_files", `Missing DI files: ${missingDi.join(", ")}`));
    } else {
      checks.push(pass("di_files", "DI files present"));
    }

    if (config.auth) {
      const authFiles = [
        join(srcDir, "models", "userModel.ts"),
        join(srcDir, "middlewares", "authMiddleware.ts"),
        join(srcDir, "controllers", "authController.ts"),
        join(srcDir, "routes", "authRouter.ts"),
        join(srcDir, "db", "repositories", "userRepository.ts"),
      ];
      const missingAuth = authFiles.filter((f) => !existsSync(f)).map((f) => f.replace(srcDir + "/", ""));
      if (missingAuth.length > 0) {
        checks.push(warn("auth_files", `Missing auth files: ${missingAuth.join(", ")}`));
      } else {
        checks.push(pass("auth_files", "Auth files present"));
      }
    }
  }

  if (orm === SupportedOrms.prisma) {
    const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
    if (!existsSync(schemaPath)) {
      checks.push(warn("prisma_schema", "prisma/schema.prisma not found — run `npx prisma migrate dev`"));
    } else {
      checks.push(pass("prisma_schema", "prisma/schema.prisma found"));
    }
  }

  output(checks, options.json);
};

const output = (checks: Check[], json: boolean) => {
  const status = worstStatus(checks);

  if (json) {
    console.log(JSON.stringify({ status, checks }, null, 2));
    if (status === "fail") process.exit(1);
    return;
  }

  console.log("\nskafr doctor\n");

  for (const check of checks) {
    const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "⚠" : "✗";
    console.log(`  ${icon} ${check.message}`);
  }

  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;

  console.log();
  if (fails === 0 && warns === 0) {
    console.log("All checks passed.");
  } else {
    const parts = [];
    if (fails > 0) parts.push(`${fails} error${fails > 1 ? "s" : ""}`);
    if (warns > 0) parts.push(`${warns} warning${warns > 1 ? "s" : ""}`);
    console.log(parts.join(", "));
  }

  if (status === "fail") process.exit(1);
};
