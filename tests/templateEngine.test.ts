import fs from "fs";

jest.mock("fs");
jest.mock("pluralize", () => {
  const actualPluralize = jest.requireActual("pluralize");
  return actualPluralize;
});

import { buildResourceContext, renderTemplate } from "../src/templateEngine";
import { ResourceContext } from "../src/types";

describe("buildResourceContext", () => {
  describe("input validation", () => {
    it("throws when resource name is empty string", () => {
      expect(() => buildResourceContext("")).toThrow(
        "resource name must not be empty",
      );
    });

    it("throws when resource name is whitespace only", () => {
      expect(() => buildResourceContext("   ")).toThrow(
        "resource name must not be empty",
      );
    });

    it("throws when resource name contains only special characters", () => {
      expect(() => buildResourceContext("!@#$%")).toThrow(
        "resourceName must contain alphanumeric characters",
      );
    });

    it("throws when resource name starts with a digit", () => {
      expect(() => buildResourceContext("1user")).toThrow(
        "Resource name must start with a letter as a first character",
      );
    });

    it("throws when resource name is a single digit", () => {
      expect(() => buildResourceContext("9")).toThrow(
        "Resource name must start with a letter as a first character",
      );
    });

    it("throws when resource name is a reserved keyword 'class'", () => {
      expect(() => buildResourceContext("class")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is a reserved keyword in uppercase 'CLASS'", () => {
      expect(() => buildResourceContext("CLASS")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'import'", () => {
      expect(() => buildResourceContext("import")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'return'", () => {
      expect(() => buildResourceContext("return")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'const'", () => {
      expect(() => buildResourceContext("const")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'let'", () => {
      expect(() => buildResourceContext("let")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'null'", () => {
      expect(() => buildResourceContext("null")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'true'", () => {
      expect(() => buildResourceContext("true")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'false'", () => {
      expect(() => buildResourceContext("false")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'async'", () => {
      expect(() => buildResourceContext("async")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'type'", () => {
      expect(() => buildResourceContext("type")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'interface'", () => {
      expect(() => buildResourceContext("interface")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });

    it("throws when resource name is reserved keyword 'enum'", () => {
      expect(() => buildResourceContext("enum")).toThrow(
        "Resource cannot use reserved JS keywords",
      );
    });
  });

  describe("valid resource names", () => {
    it("returns correct context for a simple lowercase name", () => {
      const result = buildResourceContext("product");

      expect(result.resourceClass).toBe("Product");
      expect(result.resourceVar).toBe("product");
      expect(result.resourceFile).toBe("product");
      expect(result.resourceRoute).toBe("products");
    });

    it("returns correct context for a multi-word hyphenated name", () => {
      const result = buildResourceContext("product-category");

      expect(result.resourceClass).toBe("ProductCategory");
      expect(result.resourceVar).toBe("productCategory");
      expect(result.resourceFile).toBe("product-category");
      expect(result.resourceRoute).toBe("product-categories");
    });

    it("returns correct context for an underscore_separated name", () => {
      const result = buildResourceContext("order_item");

      expect(result.resourceClass).toBe("OrderItem");
      expect(result.resourceVar).toBe("orderItem");
      expect(result.resourceFile).toBe("order_item");
    });

    it("returns correct context for a space-separated name", () => {
      const result = buildResourceContext("user profile");

      expect(result.resourceClass).toBe("UserProfile");
      expect(result.resourceVar).toBe("userProfile");
    });

    it("handles camelCase input correctly (splits on uppercase)", () => {
      const result = buildResourceContext("userProfile");

      expect(result.resourceClass).toBe("UserProfile");
      expect(result.resourceVar).toBe("userProfile");
    });

    it("handles PascalCase input correctly", () => {
      const result = buildResourceContext("UserProfile");

      expect(result.resourceClass).toBe("UserProfile");
      expect(result.resourceVar).toBe("userProfile");
    });

    it("strips special characters and processes remaining alphanumeric content", () => {
      const result = buildResourceContext("product!@#");

      expect(result.resourceClass).toBe("Product");
      expect(result.resourceVar).toBe("product");
    });

    it("returns pluralized route for a single-word resource", () => {
      const result = buildResourceContext("user");
      expect(result.resourceRoute).toBe("users");
    });

    it("returns pluralized route for a multi-word resource", () => {
      const result = buildResourceContext("blog-post");
      expect(result.resourceRoute).toBe("blog-posts");
    });

    it("handles leading/trailing whitespace in resource name", () => {
      const result = buildResourceContext("  user  ");

      expect(result.resourceClass).toBe("User");
      expect(result.resourceVar).toBe("user");
    });

    it("returns resourceFile in lowercase", () => {
      const result = buildResourceContext("PRODUCT");

      expect(result.resourceFile).toBe("product");
    });

    it("handles numeric suffix in resource name", () => {
      const result = buildResourceContext("product2");

      expect(result.resourceClass).toBe("Product2");
      expect(result.resourceVar).toBe("product2");
    });
  });
});

describe("renderTemplate", () => {
  const mockedFs = jest.mocked(fs);

  beforeEach(() => {
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validContext: ResourceContext = {
    resourceClass: "Product",
    resourceVar: "product",
    resourceFile: "product",
    resourceRoute: "products",
  };

  it("replaces a single placeholder in the template", () => {
    let capturedOutput = "";
    mockedFs.writeFileSync.mockImplementation((_path, content) => {
      capturedOutput = content as string;
    });

    renderTemplate("Hello {{ resourceClass }}!", validContext, "/output/file.ts");

    expect(capturedOutput).toBe("Hello Product!");
  });

  it("replaces multiple different placeholders", () => {
    let capturedOutput = "";
    mockedFs.writeFileSync.mockImplementation((_path, content) => {
      capturedOutput = content as string;
    });

    renderTemplate(
      "class {{ resourceClass }} { route = '{{ resourceRoute }}'; }",
      validContext,
      "/output/file.ts",
    );

    expect(capturedOutput).toBe("class Product { route = 'products'; }");
  });

  it("replaces a placeholder with surrounding whitespace in braces", () => {
    let capturedOutput = "";
    mockedFs.writeFileSync.mockImplementation((_path, content) => {
      capturedOutput = content as string;
    });

    renderTemplate("{{  resourceVar  }}", validContext, "/output/file.ts");

    expect(capturedOutput).toBe("product");
  });

  it("creates output directory recursively", () => {
    renderTemplate("content", validContext, "/deep/output/dir/file.ts");

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith("/deep/output/dir", {
      recursive: true,
    });
  });

  it("throws when an unknown placeholder is used", () => {
    expect(() =>
      renderTemplate("{{ unknownKey }}", validContext, "/output/file.ts"),
    ).toThrow("Error while rendering template: Unknown placeholder: unknownKey");
  });

  it("writes the rendered content to the specified output path", () => {
    renderTemplate("content", validContext, "/output/file.ts");

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      "/output/file.ts",
      "content",
      "utf-8",
    );
  });

  it("leaves template unchanged when there are no placeholders", () => {
    let capturedOutput = "";
    mockedFs.writeFileSync.mockImplementation((_path, content) => {
      capturedOutput = content as string;
    });

    renderTemplate("no placeholders here", validContext, "/output/file.ts");

    expect(capturedOutput).toBe("no placeholders here");
  });

  it("throws wrapped error when mkdirSync fails", () => {
    mockedFs.mkdirSync.mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });

    expect(() =>
      renderTemplate("content", validContext, "/output/file.ts"),
    ).toThrow("Error while rendering template: EACCES: permission denied");
  });
});