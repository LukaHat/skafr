#!/usr/bin/env node

import { Option, program } from "commander";
import { version } from "../package.json";
import { initCommand } from "./commands/init";
import { SupportedDBs, SupportedOrms, SupportedStacks } from "./types";
import { addCommand } from "./commands/add";

program
  .name("skaf")
  .version(version)
  .description(
    "Opinionated scaffolding tool for Express and React TypeScript projects",
  );

program
  .command("init <project-name>")
  .addOption(
    new Option("-s, --stack <stack>", "choose the stack for the project")
      .choices([...Object.values(SupportedStacks)])
      .default(SupportedStacks.express),
  )
  .addOption(
    new Option("--orm <orm>", "choose which orm you want to use")
      .choices([...Object.values(SupportedOrms)])
      .default(SupportedOrms.sequelize),
  )
  .addOption(
    new Option("--db <db>", "choose which database you want to use")
      .choices([...Object.values(SupportedDBs)])
      .default(SupportedDBs.postgres),
  )
  .option(
    "-a, --auth",
    "choose whether to have auth system already implemented",
    true,
  )
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
    false,
  )
  .description("Implement scaffolding for given resource")
  .action((resource, options) => {
    addCommand(resource, options);
  });

program
  .command("list")
  .description("List all generated resources and their file paths")
  .action(() => {
    console.log("not implemented yet");
  });

program
  .command("config")
  .description("Interactive setup for .skafc configuration file")
  .action(() => {
    console.log("not implemented yet");
  });

program.parse();

if (process.argv.length < 3) program.help();
