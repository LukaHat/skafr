import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { assertSkafrProject } from "../config";

const timestamp = () =>
  new Date().toISOString().replace(/\D/g, "").slice(0, 14);

export const migrationCommand = (name: string) => {
  assertSkafrProject();

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
