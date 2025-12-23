import postgres from "postgres";

import { config } from "./env.js";

let db: postgres.Sql | null = null;

export function getDb(): postgres.Sql {
  if (!db) {
    const connectionString =
      config.database.url ||
      `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;

    db = postgres(connectionString, {
      prepare: true,
    });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.end();
    db = null;
  }
}
