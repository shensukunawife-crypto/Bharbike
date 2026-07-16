const supabase = require('../src/utils/supabaseClient.js').default;

async function test() {
  try {
    const ids = ['a0065831-03fe-477d-ae33-be770377a34b', '646d22cf-062b-4c8f-84f8-f9b12476a98d'];
    const { data: users, error: usersErr } = await supabase.from('users').select('id, full_name, phone').in('id', ids);
    console.log('USERS:', usersErr || users);

    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, full_name, phone').in('id', ids);
    console.log('PROFILES:', profErr || profiles);
  } catch (err) {
    console.error(err);
  }
}

test();
