export enum SupportedStacks {
  express = "express",
}

export enum SupportedOrms {
  sequelize = "sequelize",
  mongoose = "mongoose",
  prisma = "prisma",
}

export enum SupportedDBs {
  postgres = "postgres",
  mongodb = "mongodb",
  mysql = "mysql",
}

export type SkafrConfig = {
  stack: SupportedStacks;
  srcDir: string;
  orm?: SupportedOrms;
  db?: SupportedDBs;
  auth?: boolean;
};

export type ResourceContext = {
  resourceClass: string;
  resourceVar: string;
  resourceFile: string;
  resourceRoute: string;
};

export class SkafrError extends Error {
  constructor(message: string, public readonly suggestion?: string) {
    super(message);
    this.name = "SkafrError";
  }
}

export enum AiFilesMode {
  all = "all",
  claude = "claude",
  copilot = "copilot",
  none = "none",
}

export type InitOptions = {
  stack: SupportedStacks;
  auth: boolean;
  orm: SupportedOrms;
  db: SupportedDBs;
  aiFiles: AiFilesMode;
  force: boolean;
  yes: boolean;
  dryRun: boolean;
  docker: boolean;
  ci: boolean;
};
