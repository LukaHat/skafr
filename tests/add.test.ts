import { existsSync, readFileSync, writeFileSync } from "fs";

jest.mock("fs");
jest.mock("../src/config");
jest.mock("../src/templateEngine");

const mockedExistsSync = jest.mocked(existsSync);
const mockedReadFileSync = jest.mocked(readFileSync);
const mockedWriteFileSync = jest.mocked(writeFileSync);

import { assertSkafrProject, loadConfig } from "../src/config";
import { buildResourceContext, renderTemplate } from "../src/templateEngine";
import { addCommand } from "../src/commands/add";

const mockedAssertSkafrProject = jest.mocked(assertSkafrProject);
const mockedLoadConfig = jest.mocked(loadConfig);
const mockedBuildResourceContext = jest.mocked(buildResourceContext);
const mockedRenderTemplate = jest.mocked(renderTemplate);

const DEFAULT_CONTEXT = {
  resourceClass: "Product",
  resourceVar: "product",
  resourceFile: "product",
  resourceRoute: "products",
};

const DEFAULT_CONFIG = {
  stack: "express" as any,
  srcDir: "/fake/src",
};

describe("addCommand", () => {
  beforeEach(() => {
    mockedAssertSkafrProject.mockImplementation(() => {});
    mockedLoadConfig.mockReturnValue(DEFAULT_CONFIG);
    mockedBuildResourceContext.mockReturnValue(DEFAULT_CONTEXT);
    mockedRenderTemplate.mockImplementation(() => {});
    mockedExistsSync.mockReturnValue(false);
    // Default: apiRouter.ts returns content with export line
    mockedReadFileSync.mockReturnValue("export default apiRouter" as any);
    mockedWriteFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls assertSkafrProject before loadConfig", () => {
    const callOrder: string[] = [];
    mockedAssertSkafrProject.mockImplementation(() => {
      callOrder.push("assertSkafrProject");
    });
    mockedLoadConfig.mockImplementation(() => {
      callOrder.push("loadConfig");
      return DEFAULT_CONFIG;
    });

    addCommand("product", { force: false, crud: false });

    expect(callOrder[0]).toBe("assertSkafrProject");
    expect(callOrder[1]).toBe("loadConfig");
  });

  it("throws a wrapped error when assertSkafrProject throws", () => {
    mockedAssertSkafrProject.mockImplementation(() => {
      throw new Error("process.exit(1)");
    });

    expect(() => addCommand("product", { force: false, crud: false })).toThrow(
      "Failed to generate resource: process.exit(1)",
    );
  });

  it("calls assertSkafrProject exactly once per invocation", () => {
    addCommand("product", { force: false, crud: false });

    expect(mockedAssertSkafrProject).toHaveBeenCalledTimes(1);
  });

  it("calls loadConfig after assertSkafrProject succeeds", () => {
    addCommand("product", { force: false, crud: false });

    expect(mockedAssertSkafrProject).toHaveBeenCalled();
    expect(mockedLoadConfig).toHaveBeenCalled();
  });

  it("throws wrapped error when a resource file already exists and force is false", () => {
    mockedExistsSync.mockReturnValue(true);

    expect(() => addCommand("product", { force: false, crud: false })).toThrow(
      "Failed to generate resource:",
    );
  });

  it("proceeds without throwing when resource file exists and force is true", () => {
    mockedExistsSync.mockReturnValue(true);

    expect(() =>
      addCommand("product", { force: true, crud: false }),
    ).not.toThrow();
  });

  it("renders exactly 4 templates (model, controller, repository, router)", () => {
    addCommand("product", { force: false, crud: false });

    expect(mockedRenderTemplate).toHaveBeenCalledTimes(4);
  });

  it("throws wrapped error when buildResourceContext throws", () => {
    mockedBuildResourceContext.mockImplementation(() => {
      throw new Error("Resource cannot use reserved JS keywords");
    });

    expect(() => addCommand("class", { force: false, crud: false })).toThrow(
      "Failed to generate resource: Resource cannot use reserved JS keywords",
    );
  });

  it("does not call loadConfig when assertSkafrProject throws", () => {
    mockedAssertSkafrProject.mockImplementation(() => {
      throw new Error("Not a skafr project");
    });

    try {
      addCommand("product", { force: false, crud: false });
    } catch {}

    expect(mockedLoadConfig).not.toHaveBeenCalled();
  });
});