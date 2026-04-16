#!/usr/bin/env node

import { program } from "commander";
import { version } from "../package.json";

program.name("skaf").version(version).description('Opinionated scaffolding tool for Express and React TypeScript projects')

program.command("init <project-name>").description("Initialize a new project with the given name").action((projectName) => {
    console.log("not implemented yet", projectName)
})


program.command("add <resource>").description("Implement scaffolding for given resource").action((resource) => {
    console.log("not implemented yet", resource)
})


program.command("list").description("List all generated resources and their file paths").action(() =>{
    console.log("not implemented yet")
})

program.command("config").description("Interactive setup for .skafc configuration file").action(()=>{
    console.log("not implemented yet")
})


program.parse();

if(process.argv.length < 3) program.help()