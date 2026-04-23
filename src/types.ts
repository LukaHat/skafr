export enum SupportedStacks {
  express = "express",
}

export enum SupportedOrms {
  sequelize = "sequelize",
}

export enum SupportedDBs {
  postgres = "postgres",
}

export type SkafConfig = {
  stack: SupportedStacks;
  srcDir: string;
};

export type ResourceContext = {
  resourceClass: string;
  resourceVar: string;
  resourceFile: string;
  resourceRoute: string;
};

export type InitOptions = {
  stack: SupportedStacks;
  auth: boolean;
  orm: SupportedOrms;
  db: SupportedDBs;
};
