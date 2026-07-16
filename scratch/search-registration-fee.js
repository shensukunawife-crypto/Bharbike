import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Let's query information_schema to see all table names
  const { data: tables } = await sb.rpc('exec_sql', {
    sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  });
  console.log('Tables in database:', tables?.map(t => t.table_name));

  // Let's search if any table has a column containing 1500 or security deposit
  // Let's run queries on potential tables
  const { data: billingCount } = await sb.from('subscription_billing').select('*').eq('amount', 1500);
  console.log('subscription_billing rows with amount=1500:', billingCount?.length);

  const { data: paymentsCount } = await sb.from('payments').select('*').eq('amount', 1500);
  console.log('payments rows with amount=1500:', paymentsCount?.length);

  // Let's check payments table where amount is 3450
  const { data: payments3450 } = await sb.from('payments').select('*').eq('amount', 3450);
  console.log('payments rows with amount=3450:', payments3450?.map(p => ({ user_id: p.user_id, status: p.status, amount: p.amount })));

  // Let's check if there is an active_deposits or security_deposits table
  if (tables) {
    const tableNames = tables.map(t => t.table_name);
    for (const name of ['deposits', 'security_deposits', 'registration_fees', 'user_deposits']) {
      if (tableNames.includes(name)) {
        const { data, error } = await sb.from(name).select('*');
        console.log(`Table '${name}' rows:`, data, 'Error:', error?.message);
      }
    }
  }
}

main();
