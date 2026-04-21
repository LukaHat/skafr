export enum SupportedStacks {
  express = "ExpressJs",
  react = "ReactJs",
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
