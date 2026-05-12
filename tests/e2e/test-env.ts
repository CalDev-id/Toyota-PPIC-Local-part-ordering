import dotenv from "dotenv";

export type BlackboxTestEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  NEXTAUTH_URL: string;
};

export function loadBlackboxTestEnv(): BlackboxTestEnv {
  dotenv.config();
  dotenv.config({ path: ".env.test", override: true });
  dotenv.config({ path: ".env.test.local", override: true });

  const sourceDatabaseUrl = process.env.DATABASE_URL;

  if (!sourceDatabaseUrl) {
    throw new Error("DATABASE_URL is required for black-box tests.");
  }

  const databaseUrl = /test/i.test(sourceDatabaseUrl)
    ? sourceDatabaseUrl
    : deriveTestDatabaseUrl(sourceDatabaseUrl);

  process.env.DATABASE_URL = databaseUrl;
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "blackbox-test-secret";
  process.env.NEXTAUTH_URL = process.env.BLACKBOX_NEXTAUTH_URL || "http://127.0.0.1:3100";
  process.env.BLACKBOX_ALLOW_DB_RESET = "1";

  return {
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };
}

function deriveTestDatabaseUrl(value: string) {
  const url = new URL(value);
  const databaseName = url.pathname.slice(1);

  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  url.pathname = `/${databaseName}_test`;
  return url.toString();
}
