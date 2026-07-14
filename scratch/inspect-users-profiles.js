import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: users, error: uErr } = await sb.from('users').select('id, full_name, phone');
  const { data: profiles, error: pErr } = await sb.from('profiles').select('id, full_name, phone');
  const { data: kyc, error: kErr } = await sb.from('kyc_documents').select('id, user_id, type').eq('status', 'pending');
  const { data: payments, error: payErr } = await sb.from('payments').select('id, user_id, amount').eq('status', 'pending');

  console.log(`Users count: ${users ? users.length : 0} (Error: ${uErr?.message || 'none'})`);
  console.log(`Profiles count: ${profiles ? profiles.length : 0} (Error: ${pErr?.message || 'none'})`);

  console.log('\nPending KYC docs:');
  kyc.forEach(doc => {
    const userInUsers = users?.find(u => u.id === doc.user_id);
    const userInProfiles = profiles?.find(u => u.id === doc.user_id);
    console.log(`User ID: ${doc.user_id} | In Users: ${userInUsers ? userInUsers.full_name : 'No'} | In Profiles: ${userInProfiles ? userInProfiles.full_name : 'No'} | Phone: ${userInProfiles?.phone || userInUsers?.phone || '—'}`);
  });

  console.log('\nPending Payments:');
  payments.forEach(p => {
    const userInUsers = users?.find(u => u.id === p.user_id);
    const userInProfiles = profiles?.find(u => u.id === p.user_id);
    console.log(`User ID: ${p.user_id} | In Users: ${userInUsers ? userInUsers.full_name : 'No'} | In Profiles: ${userInProfiles ? userInProfiles.full_name : 'No'} | Phone: ${userInProfiles?.phone || userInUsers?.phone || '—'}`);
  });
}

main();
