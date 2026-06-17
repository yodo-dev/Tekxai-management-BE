// Prisma configuration — loads the correct .env file based on NODE_ENV
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const env = process.env.NODE_ENV || "development";
config({ path: `.env.${env}` });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seeders/index.js",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
