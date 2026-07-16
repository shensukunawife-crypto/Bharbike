import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const userIds = [
    '435bfe21-6d29-46ad-8b03-e3a0f11d2871',
    'f6c3abd6-69cc-4f8d-91c2-d86996b94c26'
  ];

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds);

  if (profiles) {
    profiles.forEach(p => {
      console.log(`- ${p.full_name} (${p.phone})`);
    });
  }
}

main();
