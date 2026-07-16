const supabase = require('../src/utils/supabaseClient.js').default;

async function test() {
  try {
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);
    console.log('RECENT ORDERS SAMPLE:', orders);
  } catch (err) {
    console.error(err);
  }
}

test();
