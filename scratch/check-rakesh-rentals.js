import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const userId = '96797040-e796-43e0-aa9e-67ecfa0c0fbf';
  console.log(`Checking rentals, bookings, and orders for user ID: ${userId}...`);

  const { data: rentals } = await sb.from('rentals').select('*').eq('user_id', userId);
  console.log(`Rentals (${rentals?.length || 0}):`);
  rentals?.forEach(r => console.log(r));

  const { data: bookings } = await sb.from('bookings').select('*').eq('user_id', userId);
  console.log(`\nBookings (${bookings?.length || 0}):`);
  bookings?.forEach(b => console.log(b));

  const { data: orders } = await sb.from('orders').select('*').eq('user_id', userId);
  console.log(`\nOrders (${orders?.length || 0}):`);
  orders?.forEach(o => console.log(o));
}

main();
