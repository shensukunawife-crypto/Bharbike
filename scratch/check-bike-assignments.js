import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Query all bikes
  const { data: bikes, error: bikesErr } = await sb.from('bikes').select('*');
  if (bikesErr) {
    console.error('Error fetching bikes:', bikesErr.message);
    return;
  }

  // Query all active rentals to see assignments
  const { data: rentals, error: rentalsErr } = await sb.from('rentals')
    .select('id, user_id, bike_id, status, start_time, end_time')
    .eq('status', 'active');

  if (rentalsErr) {
    console.error('Error fetching active rentals:', rentalsErr.message);
    return;
  }

  // Query all profiles to resolve names
  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const userMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

  console.log(`\n=== ALL BIKES IN FLEET (${bikes.length}) ===`);
  bikes.forEach(b => {
    // Check if there is an active rental for this bike
    const activeRental = rentals.find(r => r.bike_id === b.id);
    const assignedUser = activeRental ? (userMap.get(activeRental.user_id) || activeRental.user_id) : 'None';
    const status = b.status || 'unknown';
    console.log(`Bike: ${b.bike_code} | ID: ${b.id} | Status: ${status} | Assigned To: ${assignedUser}`);
  });

  console.log(`\n=== ACTIVE RENTALS / ASSIGNMENTS (${rentals.length}) ===`);
  rentals.forEach(r => {
    const bike = bikes.find(b => b.id === r.bike_id);
    const bikeCode = bike ? bike.bike_code : r.bike_id;
    const userName = userMap.get(r.user_id) || r.user_id;
    console.log(`Rental ID: ${r.id} | Bike: ${bikeCode} | User: ${userName} | Started: ${r.start_time}`);
  });
}

main();
