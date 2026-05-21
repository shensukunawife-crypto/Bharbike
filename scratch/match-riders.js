import supabase from "../src/utils/supabaseClient.js";
import XLSX from 'xlsx';
import path from 'path';

async function matchRiders() {
  try {
    const excelPath = path.resolve('..', 'Rider Operations Detail.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const opsSheet = workbook.Sheets['Operations Dashboard'];
    const riders = XLSX.utils.sheet_to_json(opsSheet);

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone");

    if (error) throw error;

    console.log(`Excel Riders count: ${riders.length}`);
    console.log(`Database profiles count: ${profiles.length}`);

    let matchedByName = 0;
    let matchedByPhone = 0;

    riders.forEach((rider) => {
      const name = String(rider.Rider_Name || "").trim().toLowerCase();
      const phone = String(rider.Phone || "").trim();

      const matchName = profiles.find(p => String(p.full_name || "").trim().toLowerCase() === name);
      const matchPhone = profiles.find(p => p.phone && String(p.phone).includes(phone));

      if (matchName) matchedByName++;
      if (matchPhone) matchedByPhone++;
    });

    console.log(`Matched by name: ${matchedByName}`);
    console.log(`Matched by phone: ${matchedByPhone}`);

  } catch (err) {
    console.error("Error:", err);
  }
}

matchRiders();
