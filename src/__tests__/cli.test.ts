import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";

describe("CLI entry point", () => {
  it("dist/index.js exists", () => {
    expect(existsSync(join(process.cwd(), "dist", "index.js"))).toBe(true);
  });
});
