import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { assertSkafrProject, loadConfig } from "../config";
import { SupportedOrms } from "../types";

const timestamp = () =>
  new Date().toISOString().replace(/\D/g, "").slice(0, 14);

export const migrationCommand = (name: string) => {
  assertSkafrProject();

  const config = loadConfig();
  if (config.orm === SupportedOrms.mongoose) {
    throw new Error("Migrations are not supported with Mongoose. Use migrate-mongo or manage migrations manually.");
  }
  if (config.orm === SupportedOrms.prisma) {
    throw new Error("Use Prisma's built-in migration system: `npx prisma migrate dev --name <name>`");
  }

  const migrationsDir = join(process.cwd(), "migrations");
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
  }

  const filename = `${timestamp()}-${name}.js`;
  const filepath = join(migrationsDir, filename);

  writeFileSync(
    filepath,
    `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // TODO: implement migration
  },

  async down(queryInterface, Sequelize) {
    // TODO: implement rollback
  },
};
`,
  );

  console.log(`Created: ${filepath}`);
};
