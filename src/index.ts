#!/usr/bin/env node

if (Number(process.version.split(".")[0].slice(1)) < 22) {
  console.error(`skafr requires Node.js v22 or higher. Current: ${process.version}`);
  process.exit(1);
}

import { Option, program } from "commander";
import { version } from "../package.json";
import { initCommand } from "./commands/init";
import { AiFilesMode, SupportedDBs, SupportedOrms, SupportedStacks } from "./types";
import { addCommand } from "./commands/add";
import { removeCommand } from "./commands/remove";
import { listCommand } from "./commands/list";
import { configCommand } from "./commands/config";
import { uninstallCommand } from "./commands/uninstall";
import { doctorCommand } from "./commands/doctor";
import { routesCommand } from "./commands/routes";

program
  .name("skafr")
  .version(version)
  .description("Opinionated scaffolding tool for Express and React TypeScript projects");

program
  .command("init <project-name>")
  .addOption(
    new Option("-s, --stack <stack>", "choose the stack for the project")
      .choices([...Object.values(SupportedStacks)])
      .default(SupportedStacks.express)
  )
  .addOption(
    new Option("--orm <orm>", "choose which orm you want to use")
      .choices([...Object.values(SupportedOrms)])
      .default(SupportedOrms.sequelize)
  )
  .addOption(
    new Option("--db <db>", "choose which database you want to use")
      .choices([...Object.values(SupportedDBs)])
      .default(SupportedDBs.postgres)
  )
  .option("-a, --auth", "choose whether to have auth system already implemented", true)
  .addOption(
    new Option("--ai-files <mode>", "control which AI context files are generated")
      .choices([...Object.values(AiFilesMode)])
      .default(AiFilesMode.all)
  )
  .option("-f, --force", "skip overwrite prompts and reinitialize", false)
  .option("-y, --yes", "auto-confirm all prompts (CI/non-interactive mode)", false)
  .option("--dry-run", "preview files that would be created without writing", false)
  .option("--no-docker", "skip Dockerfile, docker-compose.yml, and .dockerignore generation")
  .option("--no-ci", "skip GitHub Actions CI workflow generation")
  .description("Initialize a new project with the given name")
  .action(async (projectName, options) => {
    await initCommand(projectName, options);
  });

program
  .command("add <resource> [migrationName]")
  .option("-f, --force", "overwrite existing files", false)
  .option("--skip-existing", "skip files that already exist without prompting", false)
  .option("--no-tests", "skip test file generation")
  .option("--dry-run", "preview files that would be generated without writing", false)
  .option(
    "--crud",
    "generate controllers and repositories with existing crud implementations",
    false
  )
  .description("Implement scaffolding for given resource")
  .action(async (resource, migrationName, options) => {
    await addCommand(resource, migrationName, options);
  });

program
  .command("remove <resource>")
  .option("-f, --force", "skip confirmation prompt", false)
  .description("Remove generated resource slice and de-register routes")
  .action(async (resource, options) => {
    await removeCommand(resource, options);
  });

program
  .command("list")
  .option("--json", "output as JSON", false)
  .description("List all generated resources and their file paths")
  .action((options) => {
    listCommand({ json: options.json });
  });

program
  .command("doctor")
  .option("--json", "output as JSON", false)
  .description("Validate project setup and dependencies")
  .action((options) => {
    doctorCommand({ json: options.json });
  });

program
  .command("routes")
  .option("--json", "output as JSON", false)
  .description("List all registered routes from apiRouter.ts")
  .action((options) => {
    routesCommand({ json: options.json });
  });

program
  .command("config")
  .description("Interactive setup for .skafrc configuration file")
  .action(async () => {
    await configCommand();
  });

program
  .command("uninstall")
  .description("Remove .skafrc and log CLI removal instructions")
  .action(uninstallCommand);

program.parse();

if (process.argv.length < 3) program.help();
