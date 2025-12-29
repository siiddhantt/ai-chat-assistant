import postgres from "postgres";

const sql = postgres({
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  database: process.env.DATABASE_NAME || "chat_agent",
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
});

const users =
  await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`;
console.log(
  "users columns:",
  users.map((c) => c.column_name)
);

const tenants =
  await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants'`;
console.log(
  "tenants columns:",
  tenants.map((c) => c.column_name)
);

const customers =
  await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'customers'`;
console.log(
  "customers columns:",
  customers.map((c) => c.column_name)
);

await sql.end();
