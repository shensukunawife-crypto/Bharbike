import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";
import { shapePublicUser } from "../src/utils/userShape.js";

function safeData(data) {
  return Array.isArray(data) ? data : [];
}

function normalizeOrder(order) {
  const rawStatus = (order.status || "pending").toLowerCase();
  const mappedStatus =
    rawStatus === "accepted"
      ? "assigned"
      : rawStatus === "rejected"
        ? "cancelled"
        : rawStatus;
  return {
    ...order,
    userName: order.userName || order.user_name || order.customer_name || "User",
    bikeId: order.bikeId || order.bike_id || order.bike_code || "-",
    assignedPartner: order.assigned_partner_name || order.assigned_user_id || "-",
    pickup_location: order.pickup_location || order.pickup || "N/A",
    drop_location: order.drop_location || order.drop || "N/A",
    paymentStatus: order.paymentStatus || order.payment_status || "paid",
    amount: Number(order.earnings || order.amount || 0),
    status: mappedStatus,
    createdAt: order.createdAt || order.created_at || new Date().toISOString(),
  };
}

async function main() {
  const [{ data: usersData, error: usersError }, { data: ordersData, error: ordersError }] =
    await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("orders").select("*"),
    ]);

  console.log("Users error:", usersError);
  console.log("Orders error:", ordersError);
  console.log("Raw Users length:", usersData?.length);
  console.log("Raw Orders length:", ordersData?.length);

  const allOrders = safeData(ordersData).map(normalizeOrder);
  const now = Date.now();

  const users = safeData(usersData)
    .filter((row) => row.is_delivery_partner !== true)
    .map((row) => {
      const normalizedRow = {
        ...row,
        full_name: row.full_name || row.name || null,
      };
      const base = shapePublicUser(normalizedRow);
      const userOrders = allOrders.filter(
        (order) =>
          String(order.userId || order.user_id || order.customer_id || "").toLowerCase() ===
            String(base.id || "").toLowerCase() ||
          String(order.userName || "").toLowerCase() ===
            String(base.full_name || "").toLowerCase()
      );
      const totalSpent = userOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
      const joinedDate = row.created_at || row.createdAt || new Date().toISOString();
      const isBlocked = row.is_blocked === true || row.status === "blocked";
      const lastOrderAt = userOrders
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.created_at || now).getTime() -
            new Date(a.createdAt || a.created_at || now).getTime()
        )[0]?.createdAt;
      return {
        ...base,
        email:
          base.email ||
          `${String(base.phone || "user").replace(/\s+/g, "")}@app.local`,
        statusLabel: isBlocked ? "Blocked" : "Active",
        isBlocked,
        totalOrders: userOrders.length,
        totalSpent,
        joinedDate,
        lastOrderAt: lastOrderAt || "-",
        lastLogin: row.last_login || row.lastLogin || joinedDate,
        lastActive: row.is_online ? "Online now" : "Recently",
      };
    });

  console.log("Processed users count:", users.length);
  if (users.length > 0) {
    console.log("First user:", users[0]);
  }
}

main();
