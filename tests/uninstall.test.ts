import { existsSync, rmSync } from "fs";
import { join } from "path";

jest.mock("fs");

const mockedExistsSync = jest.mocked(existsSync);
const mockedRmSync = jest.mocked(rmSync);

import { uninstallCommand } from "../src/commands/uninstall";

describe("uninstallCommand", () => {
  let consoleLogSpy: jest.SpyInstance;
  let cwdSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    cwdSpy = jest.spyOn(process, "cwd").mockReturnValue("/fake/cwd");
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    cwdSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("removes .skafrc and logs success message when file exists", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedRmSync.mockImplementation(() => {});

    uninstallCommand();

    expect(mockedRmSync).toHaveBeenCalledWith(join("/fake/cwd", ".skafrc"));
    expect(consoleLogSpy).toHaveBeenCalledWith("Removed .skafrc");
  });

  it("always logs CLI removal instructions when file exists and is removed", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedRmSync.mockImplementation(() => {});

    uninstallCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "To remove the CLI globally, run: npm uninstall -g skafr",
    );
  });

  it("logs a message when .skafrc does not exist", () => {
    mockedExistsSync.mockReturnValue(false);

    uninstallCommand();

    expect(mockedRmSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "No .skafrc found in current directory.",
    );
  });

  it("still logs CLI removal instructions when .skafrc does not exist", () => {
    mockedExistsSync.mockReturnValue(false);

    uninstallCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "To remove the CLI globally, run: npm uninstall -g skafr",
    );
  });

  it("logs error message when rmSync throws", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedRmSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    uninstallCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Something went wrong when deleting .skafrc",
    );
  });

  it("still logs CLI removal instructions when rmSync throws", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedRmSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    uninstallCommand();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "To remove the CLI globally, run: npm uninstall -g skafr",
    );
  });

  it("checks the correct path for .skafrc using cwd", () => {
    mockedExistsSync.mockReturnValue(false);

    uninstallCommand();

    expect(mockedExistsSync).toHaveBeenCalledWith(join("/fake/cwd", ".skafrc"));
  });

  it("does not log 'Removed .skafrc' when rmSync throws", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedRmSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    uninstallCommand();

    expect(consoleLogSpy).not.toHaveBeenCalledWith("Removed .skafrc");
  });
});