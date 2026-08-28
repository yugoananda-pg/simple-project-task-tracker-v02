import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config(); // fallback to .env if present

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // CLI migrations use the direct connection (Supabase port 5432).
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
