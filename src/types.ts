export enum SupportedStacks {
  express = "express",
}

export enum SupportedOrms {
  sequelize = "sequelize",
}

export enum SupportedDBs {
  postgres = "postgres",
}

export type SkafrConfig = {
  stack: SupportedStacks;
  srcDir: string;
};

export type ResourceContext = {
  resourceClass: string;
  resourceVar: string;
  resourceFile: string;
  resourceRoute: string;
};

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
};
