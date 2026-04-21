enum SupportedStacks {
  express = "ExpressJs",
  react = "ReactJs",
}

export type SkafConfig = {
  stack: SupportedStacks;
  srcDir: string;
};
