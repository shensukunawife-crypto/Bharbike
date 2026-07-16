import "dotenv/config";
import { writeFileSync } from "fs";
import supabase from "./src/utils/supabaseClient.js";

const TABLES = [
  "profiles",
  "users",
  "bikes",
  "vehicles",
  "orders",
  "rentals",
  "bookings",
  "delivery_partners",
  "kyc_documents",
  "support_tickets",
  "payments",
  "rider_skipped_days",
  "payment_configs",
  "admin_users",
  "notifications",
  "admin_notifications",
  "ticket_messages",
  "ads",
  "system_settings"
];

async function backup() {
  console.log("🚀 Starting database backup using Supabase API...");
  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of TABLES) {
    console.log(`📡 Fetching table: ${table}...`);
    try {
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          if (error.code === "PGRST116" || error.message.includes("does not exist")) {
            console.warn(`⚠️ Table ${table} does not exist. Skipping.`);
          } else {
            throw error;
          }
          break;
        }

        allData = allData.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }

      backupData.tables[table] = allData;
      console.log(`✅ Table ${table}: Fetched ${allData.length} rows.`);
    } catch (err) {
      console.error(`❌ Failed to backup table ${table}:`, err.message || err);
    }
  }

  const backupPath = "C:\\Users\\ronit\\Downloads\\BharBike_Database_Backup.json";
  try {
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");
    console.log(`\n🎉 Backup completed successfully! Saved to: ${backupPath}`);
  } catch (err) {
    console.error("❌ Failed to write backup file:", err);
  }
}

backup();
