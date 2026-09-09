import { config } from "dotenv";

import {
  createSeedPrismaClient,
  resetAndSeedDatabase,
} from "../src/lib/seed/database-seed";

config({ path: ".env.local" });
config();

async function main() {
  const prisma = createSeedPrismaClient();

  try {
    console.log("Wave 3 UAT seed — wiping project data and re-seeding…");
    console.log(
      "  Order: TaskComment → Subtask → Task → ProjectMember → Project → non-Super-PM users",
    );

    const summary = await resetAndSeedDatabase(prisma);

    console.log("");
    console.log("Database seed completed successfully.");
    console.log(`  Super PM preserved: ${summary.superPmEmail}`);
    console.log(`  Users deleted:      ${summary.usersDeleted}`);
    console.log(`  Dummy users added:  ${summary.usersCreated} (PM, 2× Member, Viewer)`);
    console.log(`  Projects:           ${summary.projectsCreated}`);
    console.log(`  Tasks:              ${summary.tasksCreated}`);
    console.log(`  Subtasks:           ${summary.subtasksCreated}`);
    console.log(`  Comments:           ${summary.commentsCreated}`);
    console.log("");
    console.log("Dummy accounts (PostgreSQL profiles only — not Supabase Auth logins):");
    console.log("  pm.alex@tracker.local       — Alex Morgan (PM)");
    console.log("  member.sarah@tracker.local  — Sarah Jenkins (Member)");
    console.log("  member.david@tracker.local  — David Chen (Member)");
    console.log("  viewer.rachel@tracker.local — Rachel Green (Viewer, unassigned to projects)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Database seed failed.");
  console.error(error);
  process.exit(1);
});
