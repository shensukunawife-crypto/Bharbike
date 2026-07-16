import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: bikes } = await sb.from('bikes').select('id, bike_code, status, location');
  
  const statusCounts = {};
  const locations = {};
  
  bikes.forEach(b => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    
    if (!locations[b.location]) {
      locations[b.location] = { available: 0, total: 0 };
    }
    locations[b.location].total++;
    if (b.status === "available" || b.status === "Available") {
      locations[b.location].available++;
    }
  });

  console.log("Overall Bike Statuses:");
  console.log(statusCounts);
  console.log("\nHub Breakdown:");
  for (const loc in locations) {
    console.log(`${loc}: ${locations[loc].available} available / ${locations[loc].total} total`);
  }
}

main();
