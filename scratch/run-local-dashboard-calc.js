import dotenv from 'dotenv';
dotenv.config();
import { dashboard } from '../src/admin/controllers/adminController.js';

async function main() {
  const req = {
    query: {},
    session: {}
  };

  const res = {
    locals: {},
    render: (view, data) => {
      console.log('\n--- RENDER PAGE ---');
      console.log('View:', view);
      console.log('Total Earnings:', data.totalEarnings);
      console.log('Breakdown registrationFees:', data.earningsBreakdown?.registrationFees);
      console.log('Breakdown recharges:', data.earningsBreakdown?.recharges);
      console.log('Breakdown today:', data.earningsBreakdown?.today);
      console.log('Breakdown weekly:', data.earningsBreakdown?.weekly);
      console.log('Breakdown monthly:', data.earningsBreakdown?.monthly);
      console.log('Bikes count:', data.bikes?.length);
      console.log('Orders count:', data.orders?.length);
    },
    status: (code) => {
      console.log('Status set to:', code);
      return res;
    },
    send: (msg) => {
      console.log('Sent message:', msg);
    }
  };

  try {
    await dashboard(req, res);
  } catch (e) {
    console.error('Error running dashboard function:', e);
  }
}

main();
