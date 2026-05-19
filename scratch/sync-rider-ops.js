import supabase from "../src/utils/supabaseClient.js";
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Helper to convert Excel serial dates to ISO strings
function excelDateToDateString(excelSerial) {
  if (!excelSerial || isNaN(excelSerial)) return null;
  const date = new Date(Math.round((excelSerial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

async function syncRiderOperations() {
  console.log("🚀 Starting Rider Operations Excel Sync (Exclusively matching Profiles)...");
  
  try {
    const excelPath = path.resolve('..', 'Rider Operations Detail.xlsx');
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found at: ${excelPath}`);
    }

    const workbook = XLSX.readFile(excelPath);
    
    // ============================================
    // 1. Fetch Existing Profiles
    // ============================================
    const { data: dbProfiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone");
    if (profErr) throw profErr;

    console.log(`Loaded ${dbProfiles?.length || 0} authenticated profiles from database.`);

    // ============================================
    // 2. Parse Excel Riders
    // ============================================
    const opsSheet = workbook.Sheets['Operations Dashboard'];
    const excelRiders = XLSX.utils.sheet_to_json(opsSheet);
    console.log(`Parsed ${excelRiders.length} riders from Excel.`);

    // Clear old delivery partners first
    console.log("Cleaning up old delivery partner records...");
    const { error: delClearErr } = await supabase
      .from("delivery_partners")
      .delete()
      .neq("phone", "0000000000_nonexistent");
    if (delClearErr) console.warn("Note clearing delivery_partners:", delClearErr.message);

    const partnerPayloads = [];

    for (const rider of excelRiders) {
      if (!rider.Rider_Name) continue;

      const phone = String(rider.Phone || "").trim();
      const name = String(rider.Rider_Name).trim();
      
      // Match EXCLUSIVELY against dbProfiles to ensure FK is perfectly satisfied
      let matchedProfile = (dbProfiles || []).find(p => p.phone && String(p.phone).includes(phone));
      if (!matchedProfile) {
        matchedProfile = (dbProfiles || []).find(p => String(p.full_name || "").toLowerCase() === name.toLowerCase());
      }

      // If matched, link their profile UUID. Otherwise, keep user_id as null
      const userId = matchedProfile ? matchedProfile.id : null;

      const status = String(rider['Rider Status'] || "").toLowerCase() === 'inactive' ? 'rejected' : 'approved';
      const createdDate = excelDateToDateString(rider.StartDate) || new Date().toISOString();

      partnerPayloads.push({
        user_id: userId, // perfectly null or existing profiles(id)
        name: name,
        full_name: name,
        phone: phone || '0000000000',
        city: 'Mumbai',
        vehicle_type: 'Bike',
        license_number: 'Verified (Excel)',
        aadhar_number: 'Verified (Excel)',
        status: status,
        created_at: createdDate
      });
    }

    // Insert into delivery_partners
    console.log(`Inserting ${partnerPayloads.length} delivery partners into database...`);
    const { data: partnersInserted, error: partInsertErr } = await supabase
      .from("delivery_partners")
      .insert(partnerPayloads)
      .select();

    if (partInsertErr) {
      throw partInsertErr;
    }
    console.log(`✅ Successfully synced ${partnersInserted.length} delivery partners!`);

    // ============================================
    // 3. Sync Skipped Days (Absences)
    // ============================================
    const skippedSheet = workbook.Sheets['Skipped Day'];
    const excelSkipped = XLSX.utils.sheet_to_json(skippedSheet);
    console.log(`Parsed ${excelSkipped.length} skipped day rows from Excel.`);

    // Clear old skipped days
    console.log("Cleaning up old skipped days...");
    const { error: skipClearErr } = await supabase
      .from("rider_skipped_days")
      .delete()
      .neq("id", -1);
    if (skipClearErr) console.warn("Note clearing rider_skipped_days:", skipClearErr.message);

    const skippedPayloads = [];
    excelSkipped.forEach((row) => {
      if (!row.Rider_Name) return;

      const startDate = excelDateToDateString(row.Skipped_Start);
      const endDate = excelDateToDateString(row.Skipped_End);
      const days = parseInt(row['Days Skipped'], 10) || 1;

      skippedPayloads.push({
        rider_name: String(row.Rider_Name).trim(),
        bike_id: row.BikeNo ? String(row.BikeNo).trim() : null,
        skipped_start_date: startDate,
        skipped_end_date: endDate,
        days_skipped: days,
        reason: row.Reason || 'Absence / Leave',
        status: row.Status || 'Inactive',
        created_at: new Date().toISOString()
      });
    });

    console.log(`Inserting ${skippedPayloads.length} skipped days rows...`);
    const { data: skippedInserted, error: skipInsertErr } = await supabase
      .from("rider_skipped_days")
      .insert(skippedPayloads)
      .select();

    if (skipInsertErr) {
      throw skipInsertErr;
    }
    console.log(`✅ Successfully synced ${skippedInserted.length} skipped days!`);
    console.log("\n🎉 SYNC COMPLETED SUCCESSFULLY!");

  } catch (err) {
    console.error("❌ Sync failed with error:", err.message || err);
  }
}

syncRiderOperations();
