import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { sql as dsql } from "drizzle-orm";
import * as schema from "./schema";
import { addDays, format } from "date-fns";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  console.log("Seeding shift value rules...");
  const rules: (typeof schema.shiftValueRules.$inferInsert)[] = [
    { rawValue: "1", mapsToShift: "1", label: "Shift 1", colorToken: "shift1", startTime: "06:00", endTime: "14:00" },
    { rawValue: "2", mapsToShift: "2", label: "Shift 2", colorToken: "shift2", startTime: "14:00", endTime: "22:00" },
    { rawValue: "3", mapsToShift: "3", label: "Shift 3", colorToken: "shift3", startTime: "22:00", endTime: "06:00" },
    { rawValue: "23", mapsToShift: "2", label: "Shift 2 & 3", colorToken: "shift2", startTime: "18:00", endTime: "02:00" },
    { rawValue: "OFF", mapsToShift: null, label: "Libur", colorToken: "off", startTime: null, endTime: null },
    { rawValue: "OH", mapsToShift: null, label: "Overtime/Holiday", colorToken: "oh", startTime: "08:00", endTime: "17:00" },
    { rawValue: "CT", mapsToShift: null, label: "Cuti", colorToken: "ct", startTime: null, endTime: null },
    { rawValue: "IZIN", mapsToShift: null, label: "Izin", colorToken: "ct", startTime: null, endTime: null },
  ];
  await db
    .insert(schema.shiftValueRules)
    .values(rules)
    .onConflictDoUpdate({
      target: schema.shiftValueRules.rawValue,
      set: {
        mapsToShift: dsql`excluded.maps_to_shift`,
        label: dsql`excluded.label`,
        colorToken: dsql`excluded.color_token`,
        startTime: dsql`excluded.start_time`,
        endTime: dsql`excluded.end_time`,
      },
    });

  console.log("Seeding engineers...");
  const engineerNames = [
    "Ricki",
    "Agus",
    "Jo",
    "Mohammad Duhri",
    "Brylliano",
    "Rhenaldy",
    "Hidan",
    "Velin",
    "Fahmi",
    "Izza",
  ];
  const insertedEngineers = await db
    .insert(schema.engineers)
    .values(
      engineerNames.map((name, i) => ({
        name,
        displayName: name.split(" ")[0],
        active: true,
        sortOrder: i,
      }))
    )
    .returning();

  const byName = Object.fromEntries(insertedEngineers.map((e) => [e.name, e]));

  console.log("Seeding default admin + team leader + engineer login...");
  const adminHash = await bcrypt.hash("admin123", 10);
  const leaderHash = await bcrypt.hash("leader123", 10);
  const engHash = await bcrypt.hash("engineer123", 10);
  await db
    .insert(schema.users)
    .values([
      {
        name: "Admin",
        email: "admin@f5ops.local",
        passwordHash: adminHash,
        role: "admin",
      },
      {
        name: "Ricki",
        email: "leader@f5ops.local",
        passwordHash: leaderHash,
        role: "team_leader",
        engineerId: byName["Ricki"]?.id,
      },
      {
        name: "Fahmi",
        email: "fahmi@f5ops.local",
        passwordHash: engHash,
        role: "engineer",
        engineerId: byName["Fahmi"]?.id,
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding schedule (27 Jul - 16 Aug 2026)...");
  // Grid transcribed from the spec's example spreadsheet (Mon 27/7 - Sun 2/8),
  // then repeated with light variation for the following two weeks so the
  // month view has real data to scroll through.
  const week1: Record<string, string[]> = {
    Ricki: ["OH", "OH", "-", "-", "-", "OFF", "OFF"],
    Agus: ["2", "OFF", "OFF", "OH", "OH", "OFF", "OFF"],
    Jo: ["OH", "OH", "OH", "CT", "OH", "OFF", "3"],
    "Mohammad Duhri": ["OFF", "1", "1", "1", "3", "3", "OFF"],
    Brylliano: ["1", "2", "2", "2", "OFF", "1", "1"],
    Rhenaldy: ["3", "OFF", "OFF", "1", "CT", "CT", "CT"],
    Hidan: ["23", "3", "3", "3", "OFF", "OFF", "2"],
    Velin: ["CT", "CT", "CT", "OFF", "2", "2", "OFF"],
    Fahmi: ["2", "2", "2", "2", "2", "OFF", "OFF"],
    Izza: ["1", "1", "1", "1", "1", "OFF", "OFF"],
  };

  const startDate = new Date(2026, 6, 27); // 27 Jul 2026 (Mon)
  const scheduleRows: (typeof schema.shiftSchedule.$inferInsert)[] = [];

  for (let week = 0; week < 3; week++) {
    for (const [name, values] of Object.entries(week1)) {
      const engineer = byName[name];
      if (!engineer) continue;
      values.forEach((raw, dayIdx) => {
        if (raw === "-") return; // no schedule entry for that day
        const date = addDays(startDate, week * 7 + dayIdx);
        scheduleRows.push({
          engineerId: engineer.id,
          date: format(date, "yyyy-MM-dd"),
          shiftValue: raw,
        });
      });
    }
  }

  await db
    .insert(schema.shiftSchedule)
    .values(scheduleRows)
    .onConflictDoNothing();

  console.log("Seeding sample activities, troubleshooting, titipan for 7 Aug 2026...");
  const sampleDate = "2026-08-07";

  await db.insert(schema.troubleshooting).values([
    {
      date: sampleDate,
      shift: "1",
      engineerId: byName["Fahmi"]?.id,
      title: "Troubleshoot NDS",
      description:
        "Traffic to DC could not be load balanced properly.",
      resolution:
        "There was a site change in DC causing connectivity problems between the verification service and UAM service. Rollback was performed, then ratio was gradually changed back to 1:1.",
      status: "completed",
    },
    {
      date: sampleDate,
      shift: "1",
      engineerId: byName["Fahmi"]?.id,
      title: "VS ATM NS20",
      description: "Intermittent connection resets reported on vs_atm_ns20.",
      affectedVs: "vs_atm_ns20",
      status: "in_progress",
    },
  ]);

  await db.insert(schema.activities).values([
    {
      date: sampleDate,
      shift: "1",
      engineerId: byName["Fahmi"]?.id,
      description: "Checklist Monitoring",
      status: "completed",
    },
    {
      date: sampleDate,
      shift: "1",
      engineerId: byName["Fahmi"]?.id,
      description: "Support enable disable 172.18.53.104",
      status: "completed",
    },
    {
      date: sampleDate,
      shift: "1",
      engineerId: byName["Fahmi"]?.id,
      description: "Create SQA SCR26080373789",
      status: "pending",
    },
  ]);

  await db.insert(schema.handoverTasks).values([
    {
      title: "Perubahan SSL Profile domain Conjur Follower RGN dan TBN",
      ticketReference: "SCR26071769152",
      sourceDate: sampleDate,
      sourceShift: "1",
      assignedEngineerId: byName["Fahmi"]?.id,
      status: "in_progress",
      notes: "Menunggu approval window maintenance.",
    },
    {
      title: "MOP wildcard domain",
      ticketReference: "SCR26072370603",
      sourceDate: sampleDate,
      sourceShift: "1",
      assignedEngineerId: byName["Fahmi"]?.id,
      status: "pending",
    },
  ]);

  console.log("Seed complete.");
  console.log("Login as admin: admin@f5ops.local / admin123");
  console.log("Login as team leader: leader@f5ops.local / leader123");
  console.log("Login as engineer: fahmi@f5ops.local / engineer123");

  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
