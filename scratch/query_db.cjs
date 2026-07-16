const supabase = require('../src/utils/supabaseClient.js').default;

async function test() {
  try {
    const { data: users, error: usersErr } = await supabase.from('users').select('*').limit(3);
    console.log('USERS ERR:', usersErr);
    console.log('USERS SAMPLE:', users);

    const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').limit(3);
    console.log('PROFILES ERR:', profErr);
    console.log('PROFILES SAMPLE:', profiles);

    const { data: orders, error: ordErr } = await supabase.from('orders').select('*').limit(3);
    console.log('ORDERS ERR:', ordErr);
    console.log('ORDERS SAMPLE:', orders);
  } catch (err) {
    console.error(err);
  }
}

test();
