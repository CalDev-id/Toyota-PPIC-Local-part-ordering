import { execFileSync } from "node:child_process";
import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";
import { Client } from "pg";
import { loadBlackboxTestEnv } from "./test-env";

const testEnv = loadBlackboxTestEnv();

const databaseUrl = testEnv.DATABASE_URL;
const allowReset = process.env.BLACKBOX_ALLOW_DB_RESET === "1";

if (!allowReset) {
  throw new Error("Set BLACKBOX_ALLOW_DB_RESET=1 in the test env before resetting test data.");
}

if (!databaseUrl || !/test/i.test(databaseUrl)) {
  throw new Error("Refusing to reset data because DATABASE_URL does not look like a test database.");
}

process.env.DATABASE_URL = databaseUrl;
process.env.AUTH_SECRET = testEnv.AUTH_SECRET;
process.env.NEXTAUTH_URL = testEnv.NEXTAUTH_URL;

const users: Array<{ email: string; name: string; role: Role }> = [
  { email: "admin@test.local", name: "E2E Admin", role: "ADMIN" },
  { email: "ordering@test.local", name: "E2E Ordering", role: "ORDERING" },
  { email: "delivery@test.local", name: "E2E Delivery", role: "DELIVERY" },
  { email: "receiving@test.local", name: "E2E Receiving", role: "RECEIVING" },
];

async function main() {
  await ensurePostgresDatabase(databaseUrl);

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
  });

  execFileSync("npx", ["prisma", "generate"], {
    stdio: "inherit",
    env: process.env,
  });

  const prisma = new PrismaClient();

  await prisma.notificationRecipient.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderDetail.deleteMany();
  await prisma.orderHeader.deleteMany();
  await prisma.dailyPlanning.deleteMany();

  const password = await bcrypt.hash("Passw0rd!23", 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password,
        role: user.role,
        phoneNumber: "080000000000",
      },
      create: {
        email: user.email,
        name: user.name,
        password,
        role: user.role,
        phoneNumber: "080000000000",
      },
    });
  }

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function ensurePostgresDatabase(url: string) {
  const target = new URL(url);
  const databaseName = target.pathname.slice(1);
  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = "/postgres";

  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();

  const existing = await client.query("select 1 from pg_database where datname = $1", [databaseName]);

  if (existing.rowCount === 0) {
    await client.query(`create database ${quoteIdentifier(databaseName)}`);
  }

  await client.end();
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}
