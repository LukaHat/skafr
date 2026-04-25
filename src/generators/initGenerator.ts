import { InitOptions, SupportedDBs, SupportedOrms } from "../types";

export const generatePackageJSON = (
  projectName: string,
  options: InitOptions,
) => {
  return {
    name: projectName,
    version: "1.0.0",
    scripts: {
      dev: "nodemon --exec ts-node src/server.ts",
      build: "tsc",
      start: "node dist/server.js",
      test: 'echo "Error: no test specified" && exit 1',
    },
    dependencies: {
      cors: "^2.8.6",
      dotenv: "^17.3.1",
      express: "^5.2.1",

      ...(options.auth && {
        argon2: "^0.44.0",
        jsonwebtoken: "^9.0.2",
      }),

      ...(options.db === SupportedDBs.postgres && {
        pg: "^8.19.0",
        "pg-hstore": "^2.3.4",
      }),

      ...(options.orm === SupportedOrms.sequelize && {
        sequelize: "^6.37.7",
      }),
    },
    devDependencies: {
      "@types/express": "^5.0.6",
      "@types/node": "^25.3.0",
      nodemon: "^3.1.14",
      "ts-node": "^10.9.2",
      typescript: "^5.9.3",
      "@types/cors": "^2.8.19",

      ...(options.auth && {
        "@types/jsonwebtoken": "^9.0.10",
      }),
    },
  };
};
