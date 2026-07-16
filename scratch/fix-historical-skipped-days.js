import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: records, error: fetchErr } = await sb
    .from('rider_skipped_days')
    .select('*');

  if (fetchErr) {
    console.error("Error fetching skipped days:", fetchErr);
    return;
  }

  if (!records || records.length === 0) {
    console.log("No skipped days records found.");
    return;
  }

  console.log(`Found ${records.length} skipped day records to review...`);

  let updatedCount = 0;

  for (const record of records) {
    if (record.skipped_start_date && record.skipped_end_date) {
      const start = new Date(record.skipped_start_date);
      const end = new Date(record.skipped_end_date);
      
      let correctDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (correctDays < 1) correctDays = 1;

      if (record.days_skipped !== correctDays) {
        console.log(`Updating ${record.rider_name}: from ${record.days_skipped} -> ${correctDays} days`);
        
        await sb
          .from('rider_skipped_days')
          .update({ days_skipped: correctDays })
          .eq('id', record.id);
          
        updatedCount++;
      }
    }
  }

  console.log(`Update complete. Fixed ${updatedCount} records.`);
}

main();
