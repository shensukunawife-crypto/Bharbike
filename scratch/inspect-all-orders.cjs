const supabase = require('../src/utils/supabaseClient.js').default;

async function run() {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*");
    
    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return;
    }

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, name");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return;
    }

    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u.full_name || u.name || "Delivery Partner";
    });

    console.log(`TOTAL ORDERS IN DB: ${orders.length}`);
    console.log("--------------------------------------------------------------------------------");
    orders.forEach((o, index) => {
      const dbName = userMap[o.user_id] || o.customer_name || null;
      const status = o.status;
      const id = o.id;

      const isStatusMatch = ["accepted", "ongoing", "completed", "paid", "success"].includes((status || "").toLowerCase());
      const isNameMatch = dbName && !["user", "customer", "—", "-"].includes(dbName.trim().toLowerCase());
      const passesFilter = isStatusMatch && isNameMatch;

      console.log(`Order #${index + 1}:`);
      console.log(`  ID: ${id}`);
      console.log(`  Order Code: ${o.order_code}`);
      console.log(`  Status: ${status}`);
      console.log(`  User Name (DB): ${dbName || 'NULL'}`);
      console.log(`  Passes Active/Real filter? ${passesFilter ? '✅ YES' : '❌ NO'} (Status: ${isStatusMatch ? '✅' : '❌'}, Name: ${isNameMatch ? '✅' : '❌'})`);
      console.log("--------------------------------------------------------------------------------");
    });
  } catch (err) {
    console.error(err);
  }
}

run();
