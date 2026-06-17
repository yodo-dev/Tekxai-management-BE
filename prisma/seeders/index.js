import "../../src/config/env.js";
import prisma from "../../src/shared/database/client.js";
import { seedAdmin } from "./admin.seeder.js";

async function main() {
  await seedAdmin(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[seed] Failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
