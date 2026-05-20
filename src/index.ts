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
import { uninstallCommand } from "./commands/uninstall";
import { assertSkafrProject } from "./config";

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
  .description("Initialize a new project with the given name")
  .action(async (projectName, options) => {
    await initCommand(projectName, options);
  });

program
  .command("add <resource>")
  .option("-f, --force", "overwrite existing files", false)
  .option(
    "--crud",
    "generate controllers and repositories with existing crud implementations",
    false
  )
  .description("Implement scaffolding for given resource")
  .action((resource, options) => {
    addCommand(resource, options);
  });

program
  .command("list")
  .description("List all generated resources and their file paths")
  .action(() => {
    assertSkafrProject();
  });

program
  .command("config")
  .description("Interactive setup for .skafrc configuration file")
  .action(() => {
    assertSkafrProject();
  });

program
  .command("uninstall")
  .description("Remove .skafrc and log CLI removal instructions")
  .action(uninstallCommand);

program.parse();

if (process.argv.length < 3) program.help();
