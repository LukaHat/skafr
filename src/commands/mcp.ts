import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { version } from "../../package.json";
import { addCommand } from "./add";
import { removeCommand } from "./remove";
import { listCommand } from "./list";
import { contextCommand } from "./context";
import { doctorCommand } from "./doctor";

let dispatchMutex = Promise.resolve();
const withMutex = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = dispatchMutex.then(fn);
  dispatchMutex = next.then(() => {}, () => {});
  return next;
};

const captureOutput = (fn: () => unknown): Promise<string> =>
  withMutex(async () => {
    const chunks: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => chunks.push(args.map(String).join(" "));
    try {
      await fn();
    } finally {
      console.log = orig;
    }
    return chunks.join("\n");
  });

const TOOLS = [
  {
    name: "add_resource",
    description: "Scaffold a new resource (model, controller, repository, router, validator). Idempotent — safe to retry.",
    inputSchema: {
      type: "object",
      properties: {
        resource:      { type: "string", description: "Resource name (e.g. product, userProfile)" },
        migrationName: { type: "string", description: "Optional Sequelize migration name" },
        crud:          { type: "boolean", description: "Generate CRUD implementations" },
        description:   { type: "string", description: "JSDoc annotation for the controller class" },
      },
      required: ["resource"],
    },
  },
  {
    name: "remove_resource",
    description: "Delete all files for a resource and de-register it from apiRouter, TYPES, and inversify.config.",
    inputSchema: {
      type: "object",
      properties: {
        resource: { type: "string", description: "Resource name to remove" },
      },
      required: ["resource"],
    },
  },
  {
    name: "list_resources",
    description: "List all scaffolded resources and whether each file exists.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_project_context",
    description: "Return full project state — config, resources, registered routes, and DI bindings.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "doctor",
    description: "Validate project setup: .skafrc, ORM/DB combo, dependencies, directory structure, auth files.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
];

const dispatch = async (name: string, args: Record<string, unknown>): Promise<string> => {
  switch (name) {
    case "add_resource":
      return captureOutput(() =>
        addCommand(
          args.resource as string,
          args.migrationName as string | undefined,
          {
            force: false,
            crud: !!(args.crud),
            skipExisting: false,
            idempotent: true,
            tests: true,
            dryRun: false,
            description: args.description as string | undefined,
          }
        )
      );
    case "remove_resource":
      return captureOutput(() => removeCommand(args.resource as string, { force: true }));
    case "list_resources":
      return captureOutput(() => listCommand({ json: true }));
    case "get_project_context":
      return captureOutput(() => contextCommand({ json: true }));
    case "doctor":
      return captureOutput(() => doctorCommand({ json: true }));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

export const mcpCommand = async () => {
  const server = new Server(
    { name: "skafr", version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      const text = await dispatch(name, args as Record<string, unknown>);
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: (error as Error).message }] };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};
