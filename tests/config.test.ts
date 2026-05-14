import fs from "fs";
import path from "path";

jest.mock("fs");

import { assertSkafrProject, loadConfig } from "../src/config";

const mockedFs = jest.mocked(fs);

describe("assertSkafrProject", () => {
  let exitSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let cwdSpy: jest.SpyInstance;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    cwdSpy = jest.spyOn(process, "cwd").mockReturnValue("/fake/cwd");
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    cwdSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("does not exit when .skafrc exists", () => {
    mockedFs.existsSync.mockReturnValue(true);

    expect(() => assertSkafrProject()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("calls process.exit(1) when .skafrc does not exist", () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => assertSkafrProject()).toThrow("process.exit(1)");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("logs an error message when .skafrc does not exist", () => {
    mockedFs.existsSync.mockReturnValue(false);

    try {
      assertSkafrProject();
    } catch {}

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Not a skafr project (.skafrc not found). Run `skafr init` first.",
    );
  });

  it("checks the correct path using cwd and .skafrc filename", () => {
    mockedFs.existsSync.mockImplementation((filePath) => {
      return filePath === path.join("/fake/cwd", ".skafrc");
    });

    expect(() => assertSkafrProject()).not.toThrow();
  });

  it("does not log an error when .skafrc exists", () => {
    mockedFs.existsSync.mockReturnValue(true);

    assertSkafrProject();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe("loadConfig", () => {
  let cwdSpy: jest.SpyInstance;

  beforeEach(() => {
    cwdSpy = jest.spyOn(process, "cwd").mockReturnValue("/fake/cwd");
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("returns a valid SkafrConfig when .skafrc contains valid config", () => {
    const validConfig = JSON.stringify({ stack: "express", srcDir: "src" });
    mockedFs.readFileSync.mockReturnValue(validConfig as any);

    const result = loadConfig();

    expect(result).toEqual({ stack: "express", srcDir: "src" });
  });

  it("throws when .skafrc file is not found (ENOENT)", () => {
    const enoentError = Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" });
    mockedFs.readFileSync.mockImplementation(() => {
      throw enoentError;
    });

    expect(() => loadConfig()).toThrow(".skafrc file not found");
  });

  it("throws when .skafrc contains invalid JSON", () => {
    mockedFs.readFileSync.mockReturnValue("{ invalid json }" as any);

    expect(() => loadConfig()).toThrow("Invalid JSON");
  });

  it("throws when .skafrc is missing required 'stack' field", () => {
    const missingSrcDir = JSON.stringify({ srcDir: "src" });
    mockedFs.readFileSync.mockReturnValue(missingSrcDir as any);

    expect(() => loadConfig()).toThrow(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir"',
    );
  });

  it("throws when .skafrc is missing required 'srcDir' field", () => {
    const missingStack = JSON.stringify({ stack: "express" });
    mockedFs.readFileSync.mockReturnValue(missingStack as any);

    expect(() => loadConfig()).toThrow(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir"',
    );
  });

  it("throws when 'stack' is not a supported stack value", () => {
    const invalidStack = JSON.stringify({ stack: "fastify", srcDir: "src" });
    mockedFs.readFileSync.mockReturnValue(invalidStack as any);

    expect(() => loadConfig()).toThrow(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir"',
    );
  });

  it("throws when 'srcDir' is an empty string", () => {
    const emptySrcDir = JSON.stringify({ stack: "express", srcDir: "" });
    mockedFs.readFileSync.mockReturnValue(emptySrcDir as any);

    expect(() => loadConfig()).toThrow(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir"',
    );
  });

  it("throws when 'srcDir' is a whitespace-only string", () => {
    const whitespaceSrcDir = JSON.stringify({ stack: "express", srcDir: "   " });
    mockedFs.readFileSync.mockReturnValue(whitespaceSrcDir as any);

    expect(() => loadConfig()).toThrow(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir"',
    );
  });

  it("throws when .skafrc parses as a non-object (array)", () => {
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(["express", "src"]) as any);

    expect(() => loadConfig()).toThrow(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir"',
    );
  });

  it("throws when .skafrc parses as null", () => {
    mockedFs.readFileSync.mockReturnValue("null" as any);

    expect(() => loadConfig()).toThrow(
      'Invalid .skafrc: missing or invalid required fields "stack" and "srcDir"',
    );
  });

  it("wraps unknown read errors with a descriptive message", () => {
    const unknownError = new Error("Permission denied");
    mockedFs.readFileSync.mockImplementation(() => {
      throw unknownError;
    });

    expect(() => loadConfig()).toThrow("Could not load .skafrc config: Permission denied");
  });

  it("accepts srcDir with a subdirectory path", () => {
    const config = JSON.stringify({ stack: "express", srcDir: "src/app" });
    mockedFs.readFileSync.mockReturnValue(config as any);

    const result = loadConfig();
    expect(result.srcDir).toBe("src/app");
  });

  it("reads from the correct .skafrc path based on cwd", () => {
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ stack: "express", srcDir: "src" }) as any,
    );

    loadConfig();

    expect(mockedFs.readFileSync).toHaveBeenCalledWith(
      path.join("/fake/cwd", ".skafrc"),
      "utf-8",
    );
  });
});