import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Check if bookings table exists and get its columns
  const { data: bookingRow } = await sb.from('bookings').select('*').limit(1);
  if (bookingRow && bookingRow.length > 0) {
    console.log('Bookings columns:', Object.keys(bookingRow[0]));
    
    // Query active bookings
    const { data: activeBookings } = await sb.from('bookings').select('*').eq('status', 'active');
    console.log('\nActive Bookings:', activeBookings?.length || 0);
    activeBookings.forEach(b => console.log(`User: ${b.user_id} | Bike: ${b.bike_id} | Status: ${b.status}`));
  } else {
    console.log('Bookings table is empty or doesn\'t exist.');
  }
}

main();
