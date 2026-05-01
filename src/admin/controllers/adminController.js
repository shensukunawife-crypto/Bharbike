import { randomUUID } from "crypto";
import supabase from "../../config/supabase.js";
import { shapePublicUser } from "../../utils/userShape.js";
import { listInMemoryBookings } from "../../services/bookingStore.js";
import * as paymentConfigService from "../../services/paymentConfigService.js";
import { BRAND_NAME, BRAND_PRODUCT_NAME, formatBrand } from "../../../../config/branding.js";

const dashboardSettings = {
  companyName: `${BRAND_NAME} Admin Pvt Ltd`,
  supportEmail: "support@bikeadmin.pro",
  phone: "+91 90000 00000",
  address: "Bangalore, India",
  codEnabled: true,
  onlinePaymentEnabled: true,
  minimumWalletBalance: 100,
  bikePricePerHour: 100,
  minimumRentalTime: 30,
  lateFeePerHour: 25,
  securityDeposit: 500,
  deliveryCharges: 40,
  perKmCharge: 8,
  maxDeliveryDistance: 15,
  sessionTimeout: 30,
  otpLoginEnabled: true,
  pushEnabled: true,
  smsEnabled: true,
  emailEnabled: true,
  brandColor: "#D4AF37",
  theme: "dark",
  maintenanceMode: false,
  debugMode: false,
  appName: `${BRAND_NAME} Admin`,
};

const maintenanceTickets = [
  {
    id: "MT-1001",
    bikeId: "bike-1",
    bikeCode: "BIKE-101",
    issueType: "Brake Issue",
    description: "Rear brake response is weak",
    status: "under_repair",
    technicianName: "Ravi Kumar",
    repairCost: 450,
    reportedDate: "2026-04-15",
    expectedFixDate: "2026-04-19",
    fixedDate: null,
  },
  {
    id: "MT-1002",
    bikeId: "bike-2",
    bikeCode: "BIKE-203",
    issueType: "Battery Drop",
    description: "Battery drains quickly after 20km",
    status: "in_progress",
    technicianName: "Neha Singh",
    repairCost: 700,
    reportedDate: "2026-04-16",
    expectedFixDate: "2026-04-20",
    fixedDate: null,
  },
  {
    id: "MT-1003",
    bikeId: "bike-3",
    bikeCode: "BIKE-309",
    issueType: "Tyre Replacement",
    description: "Front tyre puncture and wear",
    status: "completed",
    technicianName: "Aman Verma",
    repairCost: 320,
    reportedDate: "2026-04-10",
    expectedFixDate: "2026-04-12",
    fixedDate: "2026-04-12",
  },
];

const payoutQueue = [
  {
    id: "PO-1001",
    transactionId: "TX-7901",
    user: "Rohit Sharma",
    amount: 820,
    status: "pending",
    createdAt: "2026-04-17",
    paidAt: null,
  },
  {
    id: "PO-1002",
    transactionId: "TX-7902",
    user: "Aman Verma",
    amount: 640,
    status: "paid",
    createdAt: "2026-04-15",
    paidAt: "2026-04-16",
  },
];

const partnerState = {};

function safeData(data) {
  return Array.isArray(data) ? data : [];
}

function relativeTime(dateValue) {
  const ts = new Date(dateValue || Date.now()).getTime();
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function normalizeBike(bike, index) {
  const rawStatus = String(bike.status || bike.bike_status || "available").toLowerCase();
  const statusMap = {
    available: "available",
    in_use: "in_use",
    rented: "in_use",
    maintenance: "maintenance",
    offline: "offline",
  };
  const status = statusMap[rawStatus] || "available";
  const batteryValue = Number(bike.battery_percentage ?? bike.battery ?? 0);
  const battery = Number.isFinite(batteryValue) ? Math.max(0, Math.min(100, batteryValue)) : 0;
  const healthScore = Number(bike.health_score ?? Math.max(35, Math.min(98, battery + 8)));
  const healthStatus = healthScore >= 80 ? "Good" : healthScore >= 55 ? "Average" : "Critical";
  const usage = status === "in_use" ? "In Service" : status === "maintenance" ? "Repair Queue" : "Standby";
  const location = bike.location || bike.last_location || "Unknown Yard";
  const lastServiceDate = bike.last_service_date || bike.lastServiceDate || "2026-04-01";

  return {
    ...bike,
    bike_code: bike.bike_code || bike.code || bike.bikeId || `BIKE-${index + 1}`,
    status,
    statusLabel:
      status === "available"
        ? "Available"
        : status === "in_use"
          ? "In Use"
          : status === "maintenance"
            ? "Maintenance"
            : "Offline",
    battery,
    usage,
    location,
    lastServiceDate,
    healthStatus,
    healthScore,
  };
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

async function fetchNameMapForIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map();
  if (!unique.length) return map;
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  for (const p of safeData(profiles)) {
    if (p?.id) map.set(p.id, p.full_name || "");
  }
  const missing = unique.filter((id) => !map.get(id));
  if (missing.length) {
    const { data: users } = await supabase.from("users").select("id, full_name").in("id", missing);
    for (const u of safeData(users)) {
      if (u?.id) map.set(u.id, u.full_name || "");
    }
  }
  return map;
}

function matchesAdminOrderStatusFilter(statusRaw, filter) {
  const s = String(statusRaw || "pending").toLowerCase();
  const f = String(filter || "all").toLowerCase();
  if (f === "all") return true;
  if (f === "pending") return s === "pending" || s === "paid";
  if (f === "accepted") return s === "accepted";
  if (f === "completed") return s === "completed";
  return s === f;
}

async function loadAdminOrdersData(req) {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) console.error("[admin.orders] fetch failed", error);
  const rows = safeData(data);

  const riderKeys = rows.map((r) => r.assigned_user_id || r.delivery_partner_id).filter(Boolean);
  const nameMap = await fetchNameMapForIds([...rows.map((r) => r.user_id).filter(Boolean), ...riderKeys]);

  const enriched = rows.map((order) => {
    const s = String(order.status || "pending").toLowerCase();
    const uid = order.user_id;
    const rid = order.assigned_user_id || order.delivery_partner_id;
    const riderLabel = rid ? (nameMap.get(rid) || String(rid).slice(0, 8) + "…") : "—";
    return {
      ...order,
      userName: (uid && nameMap.get(uid)) || order.customer_name || "—",
      riderName: riderLabel,
      assignedPartner: riderLabel,
      bikeId: order.bike_id || order.bike_code || "—",
      pickup_location: order.pickup_location || order.pickup || "—",
      drop_location: order.drop_location || order.drop || "—",
      paymentStatus: order.payment_status || order.paymentStatus || "—",
      amount: Number(order.amount ?? order.price ?? 0),
      status: s,
      createdAt: order.created_at || order.createdAt,
      displayOrderId: order.order_code || String(order.id).slice(0, 13),
    };
  });

  const search = (req.query.search || "").trim().toLowerCase();
  const statusFilter = (req.query.status || "all").toLowerCase();
  const paymentFilter = (req.query.payment || "all").toLowerCase();
  const dateFilter = req.query.date || "";

  const filtered = enriched.filter((order) => {
    const idStr = String(order.id).toLowerCase();
    const codeStr = String(order.order_code || "").toLowerCase();
    if (search && !idStr.includes(search) && !codeStr.includes(search)) return false;
    if (!matchesAdminOrderStatusFilter(order.status, statusFilter)) return false;
    const paySt = String(order.paymentStatus || "").toLowerCase();
    if (paymentFilter !== "all" && paySt !== paymentFilter) return false;
    if (dateFilter && String(order.createdAt || "").slice(0, 10) !== dateFilter) return false;
    return true;
  });

  const stats = {
    total: enriched.length,
    pending: enriched.filter((o) => ["pending", "paid"].includes(o.status)).length,
    accepted: enriched.filter((o) => o.status === "accepted").length,
    completed: enriched.filter((o) => o.status === "completed").length,
  };

  const partners = Object.values(partnerState)
    .filter((p) => !p.disabled)
    .map((p, idx) => ({ id: p.userId || `partner-${idx + 1}`, name: p.name || `Partner ${idx + 1}` }));

  return {
    orders: filtered,
    stats,
    filters: {
      search: req.query.search || "",
      status: statusFilter,
      payment: paymentFilter,
      date: dateFilter,
    },
    partners,
  };
}

async function loadAdminPaymentsData(req) {
  const payFilter = (req.query.pay_status || "all").toLowerCase();

  const { data: payData, error: payErr } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (payErr) console.error("[admin.payments] table fetch", payErr);

  const paymentsRaw = safeData(payData);
  const orderIds = [...new Set(paymentsRaw.map((p) => p.order_id).filter(Boolean))];
  const orderMap = new Map();
  if (orderIds.length) {
    const { data: ordRows } = await supabase
      .from("orders")
      .select("id, amount, price, order_code, user_id")
      .in("id", orderIds);
    for (const o of safeData(ordRows)) orderMap.set(o.id, o);
  }

  const allPayments = paymentsRaw.map((row) => {
    const ord = orderMap.get(row.order_id);
    const amt = Number(row.amount ?? ord?.amount ?? ord?.price ?? 0);
    const st = String(row.status || "created").toLowerCase();
    return {
      id: row.id,
      order_id: row.order_id,
      order_code: ord?.order_code || "—",
      amount: amt,
      status: st,
      razorpay_order_id: row.razorpay_order_id || "—",
      razorpay_payment_id: row.razorpay_payment_id || "—",
      created_at: row.created_at,
    };
  });

  const filtered = allPayments.filter((p) => {
    if (payFilter === "all") return true;
    if (payFilter === "success") return p.status === "success";
    if (payFilter === "failed") return p.status === "failed" || p.status === "failure";
    return true;
  });

  const payStats = {
    total: allPayments.length,
    success: allPayments.filter((p) => p.status === "success").length,
    failed: allPayments.filter((p) => ["failed", "failure"].includes(p.status)).length,
    revenue: allPayments.reduce((sum, p) => {
      if (p.status !== "success") return sum;
      return sum + Number(p.amount || 0);
    }, 0),
  };

  return { paymentsList: filtered, payStats, payFilter, allPaymentsCount: allPayments.length };
}

function renderPage(res, data) {
  return res.render("layout", {
    BRAND_NAME,
    BRAND_PRODUCT_NAME,
    formatBrand,
    ...data,
  });
}

export async function backendMonitor(req, res) {
  return renderPage(res, {
    title: "Backend Monitor",
    active: "backend-monitor",
    bodyView: "backend-monitor",
  });
}

export async function dashboard(req, res) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      { count: usersCount, error: usersError },
      { count: bikesCount, error: bikesError },
      { count: activeRentalsCount, error: rentalsError },
      { data: bikesData, error: bikesDataError },
      { data: ordersData, error: ordersError },
      { data: earningsRows, error: earningsError },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("bikes").select("*", { count: "exact", head: true }),
      supabase
        .from("rentals")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("bikes").select("*"),
      supabase.from("orders").select("*"),
      supabase.from("earnings").select("amount, created_at, createdAt"),
    ]);

    if (usersError || bikesError || rentalsError || earningsError || bikesDataError || ordersError) {
      console.error(
        "[admin.dashboard] fetch failed",
        usersError || bikesError || rentalsError || earningsError || bikesDataError || ordersError
      );
    }
    const bikes = safeData(bikesData).map(normalizeBike);
    const orders = safeData(ordersData).map(normalizeOrder);
    const earnings = safeData(earningsRows).map((item) => ({
      amount: Number(item.amount || 0),
      createdAt: new Date(item.created_at || item.createdAt || now),
    }));

    const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);
    const earningsBreakdown = earnings.reduce(
      (acc, item) => {
        if (item.createdAt >= startOfToday) acc.today += item.amount;
        if (item.createdAt >= startOfWeek) acc.weekly += item.amount;
        if (item.createdAt >= startOfMonth) acc.monthly += item.amount;
        return acc;
      },
      { today: 0, weekly: 0, monthly: 0 }
    );

    const revenueLabels = [];
    const revenueData = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(startOfToday);
      date.setDate(startOfToday.getDate() - i);
      revenueLabels.push(date.toLocaleDateString("en-IN", { weekday: "short" }));
      revenueData.push(0);
    }
    earnings.forEach((entry) => {
      const dayStart = new Date(entry.createdAt.getFullYear(), entry.createdAt.getMonth(), entry.createdAt.getDate());
      const dayDiff = Math.floor((startOfToday - dayStart) / (1000 * 60 * 60 * 24));
      if (dayDiff >= 0 && dayDiff <= 6) {
        const slot = 6 - dayDiff;
        revenueData[slot] += entry.amount;
      }
    });

    const orderBuckets = {
      pending: 0,
      accepted: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
    };
    orders.forEach((order) => {
      const status = String(order.status || "").toLowerCase();
      if (status in orderBuckets) {
        orderBuckets[status] += 1;
      } else if (status === "rejected") {
        orderBuckets.cancelled += 1;
      }
    });

    const lowBatteryBikes = bikes.filter((bike) => Number(bike.battery || 0) < 25);
    const pendingOrders = orders.filter((order) => String(order.status || "").toLowerCase() === "pending");
    const alerts = [];
    if (lowBatteryBikes.length > 0) {
      alerts.push({
        level: "warning",
        title: "Low Battery",
        detail: `${lowBatteryBikes.length} bikes are below 25% battery.`,
      });
    }
    if (pendingOrders.length > 0) {
      alerts.push({
        level: "info",
        title: "Pending Orders",
        detail: `${pendingOrders.length} orders need admin action.`,
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        level: "success",
        title: "All Clear",
        detail: "No urgent alerts right now.",
      });
    }

    const recentActivity = orders
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.created_at || now).getTime() -
          new Date(a.createdAt || a.created_at || now).getTime()
      )
      .slice(0, 6)
      .map((order) => ({
        title: `Order ${order.orderId || order.id || "N/A"} is ${String(order.status || "pending")
          .replace("_", " ")
          .toUpperCase()}`,
        subtitle: `${order.userName || "Unknown user"} • ${order.pickup_location || "N/A"} to ${
          order.drop_location || "N/A"
        }`,
        time: new Date(order.createdAt || order.created_at || now).toLocaleString("en-IN"),
      }));

    return renderPage(res, {
      title: "Dashboard",
      active: "dashboard",
      bodyView: "dashboard",
      stats: {
        usersCount: usersCount ?? 0,
        bikesCount: bikesCount ?? 0,
        activeRentalsCount: activeRentalsCount ?? 0,
        totalEarnings,
      },
      earningsBreakdown,
      alerts,
      recentActivity,
      revenueChart: {
        labels: revenueLabels,
        data: revenueData,
      },
      ordersChart: {
        labels: ["Pending", "Accepted", "Ongoing", "Completed", "Cancelled"],
        data: [
          orderBuckets.pending,
          orderBuckets.accepted,
          orderBuckets.ongoing,
          orderBuckets.completed,
          orderBuckets.cancelled,
        ],
      },
    });
  } catch (error) {
    console.error("[admin.dashboard] unexpected error", error);
    return res.status(500).send("Unable to load dashboard");
  }
}

export async function users(req, res) {
  try {
    const [{ data: usersData, error: usersError }, { data: ordersData, error: ordersError }] =
      await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("orders").select("*"),
      ]);
    if (usersError || ordersError) {
      console.error("[admin.users] fetch failed", usersError || ordersError);
    }

    const search = (req.query.search || "").trim().toLowerCase();
    const statusFilter = (req.query.status || "all").toLowerCase();
    const dateFilter = req.query.date || "";
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const allOrders = safeData(ordersData).map(normalizeOrder);

    const users = safeData(usersData)
      .map((row) => {
        const base = shapePublicUser(row);
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
      })
      .filter((user) => {
        if (
          search &&
          !String(user.full_name || "").toLowerCase().includes(search) &&
          !String(user.phone || "").toLowerCase().includes(search) &&
          !String(user.email || "").toLowerCase().includes(search) &&
          !String(user.location || "").toLowerCase().includes(search)
        ) {
          return false;
        }
        if (statusFilter !== "all") {
          if (statusFilter === "active" && user.isBlocked) return false;
          if (statusFilter === "blocked" && !user.isBlocked) return false;
        }
        if (dateFilter && String(user.joinedDate).slice(0, 10) !== dateFilter) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.joinedDate || now).getTime() -
          new Date(a.joinedDate || now).getTime()
      );

    console.log("ADMIN USERS:", users);

    const stats = {
      total: users.length,
      active: users.filter((u) => !u.isBlocked).length,
      newToday: users.filter(
        (u) => new Date(u.joinedDate || now).getTime() >= todayStart.getTime()
      ).length,
      blocked: users.filter((u) => u.isBlocked).length,
    };

    return renderPage(res, {
      title: "Users",
      active: "users",
      bodyView: "users",
      users,
      stats,
      filters: {
        search,
        status: statusFilter,
        date: dateFilter,
      },
    });
  } catch (error) {
    console.error("[admin.users] unexpected error", error);
    return res.status(500).send("Unable to load users");
  }
}

export async function userProfile(req, res) {
  try {
    const { userId } = req.params;
    const [{ data: userRow }, { data: ordersData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("orders").select("*"),
    ]);
    if (!userRow) {
      return res.status(404).send("User not found");
    }
    const base = shapePublicUser(userRow);
    const orders = safeData(ordersData)
      .map(normalizeOrder)
      .filter(
        (order) =>
          String(order.userId || order.user_id || order.customer_id || "").toLowerCase() ===
            String(userId).toLowerCase() ||
          String(order.userName || "").toLowerCase() ===
            String(base.full_name || "").toLowerCase()
      );
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const paymentMethod = totalSpent > 0 ? "Online" : "Cash";
    const profile = {
      ...base,
      email:
        base.email ||
        `${String(base.phone || "user").replace(/\s+/g, "")}@app.local`,
      joinedDate: userRow.created_at || userRow.createdAt || new Date().toISOString(),
      lastLogin: userRow.last_login || userRow.lastLogin || "N/A",
      lastOrder: orders[0]?.id || "N/A",
      lastActive: userRow.is_online ? "Online now" : "Recently",
      totalOrders: orders.length,
      totalSpent,
      paymentMethod,
    };

    return renderPage(res, {
      title: "User Profile",
      active: "users",
      bodyView: "user-profile",
      user: profile,
      orderHistory: orders,
    });
  } catch (error) {
    console.error("[admin.userProfile] failed", error);
    return res.status(500).send("Unable to load user profile");
  }
}

export async function bikes(req, res) {
  try {
    const { data, error } = await supabase.from("bikes").select("*");
    if (error) {
      console.error("[admin.bikes] fetch failed", error);
    }
    const allBikes = safeData(data).map(normalizeBike);
    const search = (req.query.search || "").trim().toLowerCase();
    const statusFilter = (req.query.status || "all").toLowerCase();
    const lowBatteryOnly = req.query.lowBattery === "true";
    const bikes = allBikes.filter((bike) => {
      if (search && !String(bike.bike_code).toLowerCase().includes(search)) return false;
      if (statusFilter !== "all" && bike.status !== statusFilter) return false;
      if (lowBatteryOnly && bike.battery > 20) return false;
      return true;
    });
    return renderPage(res, {
      title: "Bikes",
      active: "bikes",
      bodyView: "bikes",
      bikes,
      filters: {
        search,
        status: statusFilter,
        lowBattery: lowBatteryOnly,
      },
    });
  } catch (error) {
    console.error("[admin.bikes] unexpected error", error);
    return res.status(500).send("Unable to load bikes");
  }
}

export async function bikeDetails(req, res) {
  try {
    const { bikeId } = req.params;
    const { data: bikeRow } = await supabase.from("bikes").select("*").eq("id", bikeId).maybeSingle();
    if (!bikeRow) {
      return res.status(404).send("Bike not found");
    }
    const bike = normalizeBike(bikeRow, 0);
    const { data: orders } = await supabase.from("orders").select("*").eq("bike_id", bikeId);
    const { data: rentals } = await supabase.from("rentals").select("*").eq("bikeId", bikeId);
    const maintenanceLogs = maintenanceTickets
      .filter((item) => item.bikeId === bikeId || item.bikeCode === bike.bike_code)
      .map((item) => ({
        issue: item.issueType,
        status: item.status,
        cost: item.repairCost,
        date: item.reportedDate,
      }));

    return renderPage(res, {
      title: "Bike Details",
      active: "bikes",
      bodyView: "bike-details",
      bike,
      usageHistory: safeData(rentals).slice(0, 10),
      ordersHistory: safeData(orders).map(normalizeOrder).slice(0, 10),
      maintenanceLogs,
    });
  } catch (error) {
    console.error("[admin.bikeDetails] failed", error);
    return res.status(500).send("Unable to load bike details");
  }
}

export async function orders(req, res) {
  try {
    const payload = await loadAdminOrdersData(req);
    return renderPage(res, {
      title: "Orders",
      active: "orders",
      bodyView: "orders",
      ...payload,
      supabaseRealtimeEnabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      supabasePublicUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    });
  } catch (error) {
    console.error("[admin.orders] unexpected error", error);
    return res.status(500).send("Unable to load orders");
  }
}

/** GET /api/admin/orders — JSON for admin panel refresh (Bearer admin JWT). */
export async function apiJsonAdminOrders(req, res) {
  try {
    const payload = await loadAdminOrdersData(req);
    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error("[apiJsonAdminOrders]", error);
    return res.status(500).json({ success: false, message: error?.message || "Failed to load orders" });
  }
}

/** GET /api/admin/payments — JSON list + stats. */
export async function apiJsonAdminPayments(req, res) {
  try {
    const configs = await paymentConfigService.listPaymentConfigs();
    const pay = await loadAdminPaymentsData(req);
    return res.json({
      success: true,
      data: { ...pay, configs: configs || [] },
    });
  } catch (error) {
    console.error("[apiJsonAdminPayments]", error);
    return res.status(500).json({ success: false, message: error?.message || "Failed to load payments" });
  }
}

export async function bookingsPage(req, res) {
  try {
    let { data, error } = await supabase
      .from("rentals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error?.message?.toLowerCase().includes("could not find the table 'public.rentals'")) {
      ({ data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }));
      if (error?.message?.toLowerCase().includes("could not find the table 'public.bookings'")) {
        ({ data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }));
      }
    }

    if (error) {
      console.error("[admin.bookingsPage] fetch failed", error);
    }

    const bookings = error ? listInMemoryBookings() : safeData(data);
    return renderPage(res, {
      title: "Bookings",
      active: "bookings",
      bodyView: "bookings",
      bookings,
    });
  } catch (error) {
    console.error("[admin.bookingsPage] unexpected error", error);
    return res.status(500).send("Unable to load bookings");
  }
}

export async function kycDocumentsPage(req, res) {
  try {
    const [{ data: usersData, error: usersError }, { data: profilesData, error: profilesError }] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, aadhaar_front_url, aadhaar_back_url, pan_card_url, electricity_bill_url, selfie_url, updated_at")
        .order("updated_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);
    let data = usersData;
    let error = usersError;

    if (error) {
      console.error("[admin.kycDocumentsPage] fetch failed", error);
    }
    if (profilesError) {
      console.error("[admin.kycDocumentsPage] profiles fetch failed", profilesError);
    }

    const profileNameMap = new Map(safeData(profilesData).map((p) => [String(p.id), p.full_name || null]));
    const rows = safeData(data)
      .filter(
        (item) =>
          item?.aadhaar_front_url ||
          item?.aadhaar_back_url ||
          item?.pan_card_url ||
          item?.electricity_bill_url ||
          item?.selfie_url
      )
      .map((item) => ({
        ...item,
        user_name: item.full_name || profileNameMap.get(String(item.id)) || "User",
      }));
    const stats = {
      total: rows.length,
      aadhaar: rows.filter((x) => x.aadhaar_front_url || x.aadhaar_back_url).length,
      pan: rows.filter((x) => x.pan_card_url).length,
      bill: rows.filter((x) => x.electricity_bill_url).length,
      selfie: rows.filter((x) => x.selfie_url).length,
    };

    return renderPage(res, {
      title: "KYC Documents",
      active: "kyc-documents",
      bodyView: "kyc-documents",
      documents: rows,
      stats,
    });
  } catch (error) {
    console.error("[admin.kycDocumentsPage] unexpected error", error);
    return res.status(500).send("Unable to load KYC documents");
  }
}

export async function orderDetails(req, res) {
  try {
    const { orderId } = req.params;
    const { data: orderRow, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (error) {
      console.error("[admin.orderDetails] fetch failed", error);
    }
    if (!orderRow) {
      return res.status(404).send("Order not found");
    }
    const order = normalizeOrder(orderRow);
    const timeline = [
      { label: "Order Created", done: true, time: String(order.createdAt).slice(0, 16).replace("T", " ") },
      { label: "Assigned", done: ["assigned", "ongoing", "completed"].includes(order.status), time: "-" },
      { label: "Picked", done: ["ongoing", "completed"].includes(order.status), time: "-" },
      { label: "Delivered", done: order.status === "completed", time: "-" },
    ];

    return renderPage(res, {
      title: "Order Details",
      active: "orders",
      bodyView: "order-details",
      order,
      timeline,
      tracking: {
        route: `${order.pickup_location} -> ${order.drop_location}`,
        partnerStatus: order.status === "ongoing" ? "On Route" : order.status,
      },
    });
  } catch (error) {
    console.error("[admin.orderDetails] unexpected error", error);
    return res.status(500).send("Unable to load order details");
  }
}

export async function deliveryPartners(req, res) {
  try {
    let { data, error } = await supabase
      .from("delivery_partners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin.deliveryPartners] fetch failed", error);
      return res.status(500).send("Unable to load delivery applications");
    }

    const applications = safeData(data);
    const filter = String(req.query.status || "all").toLowerCase();
    const rows = applications.filter((item) => (filter === "all" ? true : String(item.status) === filter));
    const stats = {
      total: applications.length,
      pending: applications.filter((x) => x.status === "pending").length,
      approved: applications.filter((x) => x.status === "approved").length,
      rejected: applications.filter((x) => x.status === "rejected").length,
    };

    return renderPage(res, {
      title: "Delivery Partner Applications",
      active: "delivery-partners",
      bodyView: "delivery-partners",
      applications: rows,
      stats,
      filter,
    });
  } catch (error) {
    console.error("[admin.deliveryPartners] unexpected error", error);
    return res.status(500).send("Unable to load delivery applications");
  }
}

export async function deliveryPartnerProfile(req, res) {
  try {
    const { partnerId } = req.params;
    const [{ data: users }, { data: orders }, { data: earnings }] = await Promise.all([
      supabase.from("users").select("*").eq("id", partnerId).maybeSingle(),
      supabase.from("orders").select("*").eq("assigned_user_id", partnerId),
      supabase.from("earnings").select("*").eq("userId", partnerId),
    ]);

    if (!users) {
      return res.status(404).send("Partner not found");
    }

    const orderHistory = safeData(orders).map((order) => normalizeOrder(order));
    const earningsHistory = safeData(earnings).map((item, index) => ({
      id: `ER-${index + 1}`,
      type: item.type || "delivery",
      amount: Number(item.amount || 0),
      date: (item.createdAt || item.created_at || new Date().toISOString()).slice(0, 10),
    }));
    const total = earningsHistory.reduce((sum, item) => sum + item.amount, 0);

    return renderPage(res, {
      title: "Partner Profile",
      active: "delivery-partners",
      bodyView: "delivery-partner-profile",
      partner: users,
      docs: ["Driving License", "Vehicle RC", "Insurance", "ID Proof"],
      earningsHistory,
      orderHistory,
      total,
    });
  } catch (error) {
    console.error("[admin.deliveryPartnerProfile] failed", error);
    return res.status(500).send("Unable to load partner profile");
  }
}

export async function earnings(req, res) {
  try {
    const filter = req.query.filter || "weekly";
    const { data, error } = await supabase.from("earnings").select("*");
    if (error) {
      console.error("[admin.earnings] fetch failed", error);
    }
    const rows = safeData(data);
    const now = Date.now();
    const days = filter === "today" ? 1 : filter === "monthly" ? 30 : 7;
    const filtered = rows.filter((row) => {
      const created = new Date(row.createdAt || row.created_at || now).getTime();
      return now - created <= days * 24 * 60 * 60 * 1000;
    });

    const rental = filtered
      .filter((item) => item.type === "rental")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const delivery = filtered
      .filter((item) => item.type === "delivery")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEarnings = filtered
      .filter((item) => new Date(item.createdAt || item.created_at || now).getTime() >= todayStart.getTime())
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingPayout = payoutQueue
      .filter((item) => item.status === "pending")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalPaidAmount = payoutQueue
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const transactions = filtered.slice(0, 20).map((item, index) => ({
      id: `TX-${1000 + index}`,
      user: item.userName || item.user || "User",
      type: item.type === "delivery" ? "Delivery" : "Bike",
      amount: Number(item.amount || 0),
      status: Number(item.amount || 0) > 0 ? "Success" : "Pending",
      date: (item.createdAt || item.created_at || new Date().toISOString()).slice(0, 10),
    }));

    const payoutHistory = payoutQueue
      .filter((item) => item.status === "paid")
      .map((item) => ({
        payoutId: item.id,
        transactionId: item.transactionId,
        user: item.user,
        amount: item.amount,
        paidAt: item.paidAt,
      }));

    const recentActivity = transactions.slice(0, 5);
    const pieSeries = [
      { label: "Bike", value: rental },
      { label: "Delivery", value: delivery },
    ];

    return renderPage(res, {
      title: "Earnings",
      active: "earnings",
      bodyView: "earnings",
      filter,
      totals: {
        rental,
        delivery,
        total: rental + delivery,
      },
      financeCards: {
        todayEarnings,
        pendingPayout,
        totalPaidAmount,
      },
      chartSeries: filtered.slice(0, 10).map((item, index) => ({
        label: `Day ${index + 1}`,
        value: Number(item.amount || 0),
      })),
      transactions,
      payoutQueue: payoutQueue.filter((item) => item.status === "pending"),
      payoutHistory,
      pieSeries,
      recentActivity,
    });
  } catch (error) {
    console.error("[admin.earnings] unexpected error", error);
    return res.status(500).send("Unable to load earnings");
  }
}

export async function releasePayout(req, res) {
  try {
    const payout = payoutQueue.find((item) => item.id === req.params.payoutId);
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }
    payout.status = "paid";
    payout.paidAt = new Date().toISOString().slice(0, 10);
    return res.json({ success: true, message: "Payment released successfully" });
  } catch (error) {
    console.error("[admin.releasePayout] failed", error);
    return res.status(500).json({ success: false, message: "Unable to release payment" });
  }
}

export async function analytics(req, res) {
  try {
    const filter = req.query.filter || "7d";
    const days = filter === "today" ? 1 : filter === "30d" ? 30 : 7;
    const now = Date.now();

    const [
      { data: earningRows, error: earningError },
      { data: orderRows, error: orderError },
      { data: bikeRows, error: bikesError },
      { data: rentalRows, error: rentalError },
    ] = await Promise.all([
      supabase.from("earnings").select("*"),
      supabase.from("orders").select("*"),
      supabase.from("bikes").select("*"),
      supabase.from("rentals").select("*"),
    ]);
    if (earningError || orderError) {
      console.error("[admin.analytics] fetch failed", earningError || orderError);
    }
    if (bikesError || rentalError) {
      console.error("[admin.analytics] bike/rental fetch failed", bikesError || rentalError);
    }

    const filteredEarnings = safeData(earningRows).filter((item) => {
      const created = new Date(item.createdAt || item.created_at || now).getTime();
      return now - created <= days * 24 * 60 * 60 * 1000;
    });
    const filteredOrders = safeData(orderRows).filter((item) => {
      const created = new Date(item.createdAt || item.created_at || now).getTime();
      return now - created <= days * 24 * 60 * 60 * 1000;
    });

    const totalRevenue = filteredEarnings.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalOrders = filteredOrders.length;
    const activeBikes = safeData(bikeRows).filter((bike) => {
      const status = bike.status || bike.bike_status || "";
      return status === "available" || status === "in_use" || status === "rented";
    }).length;
    const deliveryEarnings = filteredEarnings
      .filter((item) => item.type === "delivery")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const revenueSeries = filteredEarnings.slice(0, 10).map((item, idx) => ({
      label: `P${idx + 1}`,
      value: Number(item.amount || 0),
    }));
    const ordersSeries = filteredOrders.slice(0, 10).map((item, idx) => ({
      label: `O${idx + 1}`,
      value: Number(item.earnings || 0),
    }));
    const bikeEarnings = filteredEarnings
      .filter((item) => item.type === "rental")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pieSeries = [
      { label: "Bike", value: bikeEarnings },
      { label: "Delivery", value: deliveryEarnings },
    ];

    const rentalUsageMap = safeData(rentalRows).reduce((acc, rental) => {
      const bikeId = rental.bikeId || rental.bike_id || "Unknown";
      acc[bikeId] = (acc[bikeId] || 0) + 1;
      return acc;
    }, {});
    const mostUsedBike = Object.entries(rentalUsageMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const totalHours = safeData(rentalRows).reduce((sum, item) => {
      const start = new Date(item.startTime || item.start_time || now).getTime();
      const end = new Date(item.endTime || item.end_time || now).getTime();
      return sum + Math.max(0, (end - start) / (1000 * 60 * 60));
    }, 0);

    const statusCount = filteredOrders.reduce(
      (acc, item) => {
        const status = (item.status || "").toLowerCase();
        if (status === "completed") acc.completed += 1;
        else if (status === "pending") acc.pending += 1;
        else if (status === "cancelled" || status === "rejected") acc.cancelled += 1;
        return acc;
      },
      { completed: 0, pending: 0, cancelled: 0 }
    );

    const totalDeliveries = filteredOrders.filter((item) =>
      ["completed", "accepted"].includes((item.status || "").toLowerCase())
    ).length;
    const avgTime = totalDeliveries ? Math.round((totalDeliveries * 28) / totalDeliveries) : 0;
    const recentOrders = filteredOrders
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.created_at || now).getTime() -
          new Date(a.createdAt || a.created_at || now).getTime()
      )
      .slice(0, 5)
      .map((order) => normalizeOrder(order));

    return renderPage(res, {
      title: "Analytics",
      active: "analytics",
      bodyView: "analytics",
      filter,
      topCards: {
        totalRevenue,
        totalOrders,
        activeBikes,
        deliveryEarnings,
      },
      revenueSeries,
      ordersSeries,
      pieSeries,
      usage: {
        mostUsedBike,
        totalHours: Number(totalHours.toFixed(1)),
      },
      orderStatus: statusCount,
      deliveryStats: {
        avgTime,
        totalDeliveries,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("[admin.analytics] unexpected error", error);
    return res.status(500).send("Unable to load analytics");
  }
}

export async function maintenance(req, res) {
  try {
    const [{ data, error }, { data: supportRows, error: supportError }] = await Promise.all([
      supabase.from("bikes").select("*"),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (error || supportError) {
      console.error("[admin.maintenance] fetch failed", error || supportError);
    }
    const bikes = safeData(data).map(normalizeBike);
    const supportTickets = safeData(supportRows);
    const filter = req.query.filter || "all";
    const search = String(req.query.search || "").trim().toLowerCase();
    const filteredTickets = maintenanceTickets.filter((ticket) => {
      if (search && !String(ticket.bikeCode || "").toLowerCase().includes(search)) return false;
      if (filter === "active") {
        return ticket.status === "under_repair" || ticket.status === "in_progress";
      }
      if (filter === "completed") {
        return ticket.status === "completed";
      }
      return true;
    });
    const history = maintenanceTickets.filter((item) => item.status === "completed");
    const maintenanceStats = {
      total: filteredTickets.length,
      inProgress: filteredTickets.filter((x) => x.status === "in_progress").length,
      completed: filteredTickets.filter((x) => x.status === "completed").length,
      totalCost: filteredTickets.reduce((sum, x) => sum + Number(x.repairCost || 0), 0),
    };
    return renderPage(res, {
      title: "Maintenance",
      active: "maintenance",
      bodyView: "maintenance",
      bikes,
      tickets: filteredTickets,
      history,
      filter,
      search,
      supportTickets,
      maintenanceStats,
    });
  } catch (error) {
    console.error("[admin.maintenance] unexpected error", error);
    return res.status(500).send("Unable to load maintenance");
  }
}

export async function supportPage(req, res) {
  try {
    const filter = String(req.query.status || "all").toLowerCase();
    const search = String(req.query.search || "").trim().toLowerCase();
    const sort = String(req.query.sort || "newest").toLowerCase() === "oldest" ? "oldest" : "newest";
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: sort === "oldest" });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[admin.supportPage] fetch failed", error);
      return res.status(500).send("Unable to load support tickets");
    }
    let tickets = safeData(data);
    if (search) {
      const q = search.replace(/^#/, "");
      tickets = tickets.filter((x) => {
        const id = String(x.id || "").toLowerCase();
        const userId = String(x.user_id || "").toLowerCase();
        const ticketNum = x.ticket_number != null ? String(x.ticket_number) : "";
        return id.includes(q) || userId.includes(q) || ticketNum.includes(q);
      });
    }
    const stats = {
      total: tickets.length,
      pending: tickets.filter((x) => x.status === "pending").length,
      inProgress: tickets.filter((x) => x.status === "in_progress").length,
      resolved: tickets.filter((x) => x.status === "resolved").length,
    };
    const displayTickets = tickets.map((t) => ({
      ...t,
      shortId: t.ticket_number != null ? String(t.ticket_number) : "—",
      relativeCreatedAt: relativeTime(t.created_at),
    }));

    return renderPage(res, {
      title: "Support Tickets",
      active: "support",
      bodyView: "support",
      filter,
      search,
      sort,
      tickets: displayTickets,
      stats,
    });
  } catch (error) {
    console.error("[admin.supportPage] unexpected error", error);
    return res.status(500).send("Unable to load support tickets");
  }
}

export async function convertSupportToMaintenance(req, res) {
  try {
    const { ticketId } = req.params;
    const { data, error } = await supabase.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
    if (error || !data) {
      return res.status(404).json({ success: false, message: "Support ticket not found" });
    }
    const mappedIssue = String(data.issue_type || "other")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const mtId = `MT-${1000 + maintenanceTickets.length + 1}`;
    maintenanceTickets.unshift({
      id: mtId,
      bikeId: data.bike_name || `bike-${maintenanceTickets.length + 1}`,
      bikeCode: data.bike_name || "BIKE-UNASSIGNED",
      issueType: mappedIssue,
      description: data.description || "Converted from support ticket",
      status: "in_progress",
      technicianName: "Auto-Assigned",
      repairCost: 0,
      reportedDate: new Date(data.created_at || Date.now()).toISOString().slice(0, 10),
      expectedFixDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      fixedDate: null,
    });
    await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", ticketId);
    return res.json({ success: true, message: "Converted to maintenance successfully" });
  } catch (error) {
    console.error("[admin.convertSupportToMaintenance] failed", error);
    return res.status(500).json({ success: false, message: "Unable to convert ticket" });
  }
}

export async function notificationsPage(req, res) {
  const history = [
    {
      title: "Weekend Rental Offer",
      audience: "All Users",
      type: "Push, Email",
      status: "Sent",
      time: "2026-04-17 10:30 AM",
    },
    {
      title: "Partner Incentive Update",
      audience: "Delivery Partners",
      type: "Push, SMS",
      status: "Scheduled",
      time: "2026-04-18 09:00 AM",
    },
    {
      title: "Inactive User Reactivation",
      audience: "Inactive Users",
      type: "Email",
      status: "Sent",
      time: "2026-04-16 07:45 PM",
    },
  ];

  return renderPage(res, {
    title: "Notifications",
    active: "notifications",
    bodyView: "notifications",
    history,
  });
}

/** Static documentation / visual workflow (no DB). Sync handler — avoids Express 4 async rejection gaps. */
export function systemWorkflowPage(req, res, next) {
  try {
    return res.render(
      "layout",
      {
        BRAND_NAME,
        BRAND_PRODUCT_NAME,
        formatBrand,
        title: "System Workflow",
        active: "system-workflow",
        bodyView: "system-workflow",
        mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || "",
      },
      (err, html) => {
        if (err) return next(err);
        res.send(html);
      },
    );
  } catch (err) {
    return next(err);
  }
}

export async function settingsPage(req, res) {
  return renderPage(res, {
    title: "Settings",
    active: "settings",
    bodyView: "settings",
    settings: dashboardSettings,
  });
}

export async function paymentsPage(req, res) {
  try {
    const configs = await paymentConfigService.listPaymentConfigs();
    const pay = await loadAdminPaymentsData(req);
    return renderPage(res, {
      title: "Payments",
      active: "payments",
      bodyView: "payments",
      configs: configs || [],
      paymentsList: pay.paymentsList,
      payStats: pay.payStats,
      payFilter: pay.payFilter,
      supabaseRealtimeEnabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      supabasePublicUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    });
  } catch (error) {
    console.error("[admin.paymentsPage] failed", error);
    return renderPage(res, {
      title: "Payments",
      active: "payments",
      bodyView: "payments",
      configs: [],
      paymentsList: [],
      payStats: { total: 0, success: 0, failed: 0, revenue: 0 },
      payFilter: "all",
      supabaseRealtimeEnabled: false,
      supabasePublicUrl: "",
      supabaseAnonKey: "",
    });
  }
}

export async function skippedDaysPage(req, res) {
  res.set("Cache-Control", "no-store, private, must-revalidate");
  try {
    const { data, error } = await supabase
      .from("rider_skipped_days")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin.skippedDaysPage]", error);
    }
    return renderPage(res, {
      title: "Rider Skipped Days",
      active: "skipped-days",
      bodyView: "skipped-days",
      skippedRows: safeData(data),
    });
  } catch (error) {
    console.error("[admin.skippedDaysPage] unexpected", error);
    return renderPage(res, {
      title: "Rider Skipped Days",
      active: "skipped-days",
      bodyView: "skipped-days",
      skippedRows: [],
    });
  }
}

export async function addUser(req, res) {
  try {
    const full_name = req.body.full_name ?? req.body.name ?? null;
    const { phone, email, location } = req.body;
    const id = typeof req.body.id === "string" && req.body.id.length >= 32 ? req.body.id : randomUUID();
    await supabase.from("profiles").insert([
      {
        id,
        full_name,
        phone,
        email: email ?? null,
        location: location ?? null,
      },
    ]);
    return res.json({ success: true, message: "User added" });
  } catch (error) {
    console.error("[admin.addUser] failed", error);
    return res.status(500).json({ success: false, message: "Unable to add user" });
  }
}

export async function editUser(req, res) {
  try {
    const { userId } = req.params;
    const full_name = req.body.full_name ?? req.body.name;
    const { phone, email, location } = req.body;
    await supabase
      .from("profiles")
      .update({
        ...(full_name !== undefined && { full_name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(location !== undefined && { location }),
      })
      .eq("id", userId);
    return res.json({ success: true, message: "User updated" });
  } catch (error) {
    console.error("[admin.editUser] failed", error);
    return res.status(500).json({ success: false, message: "Unable to update user" });
  }
}

export async function blockUser(req, res) {
  try {
    const { userId } = req.params;
    const { data: row } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!row) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const isBlocked = row.is_blocked === true || row.status === "blocked";
    const nextBlocked = !isBlocked;
    await supabase
      .from("profiles")
      .update({
        is_online: nextBlocked ? false : row.is_online ?? false,
        is_blocked: nextBlocked,
        status: nextBlocked ? "blocked" : "active",
      })
      .eq("id", userId);
    return res.json({ success: true, message: nextBlocked ? "User blocked" : "User unblocked" });
  } catch (error) {
    console.error("[admin.blockUser] failed", error);
    return res.status(500).json({ success: false, message: "Unable to block user" });
  }
}

export async function addBike(req, res) {
  try {
    const { bike_code, status } = req.body;
    await supabase.from("bikes").insert([
      {
        bike_code,
        status: status || "available",
        battery_percentage: Number(req.body.battery || 0),
        location: req.body.location || "Main Hub",
        last_service_date: req.body.lastServiceDate || new Date().toISOString().slice(0, 10),
      },
    ]);
    return res.json({ success: true, message: "Bike added" });
  } catch (error) {
    console.error("[admin.addBike] failed", error);
    return res.status(500).json({ success: false, message: "Unable to add bike" });
  }
}

export async function assignBike(req, res) {
  try {
    await supabase.from("bikes").update({ status: "in_use" }).eq("id", req.params.bikeId);
    return res.json({ success: true, message: "Bike assigned successfully" });
  } catch (error) {
    console.error("[admin.assignBike] failed", error);
    return res.status(500).json({ success: false, message: "Unable to assign bike" });
  }
}

export async function sendBikeToMaintenance(req, res) {
  try {
    await supabase.from("bikes").update({ status: "maintenance" }).eq("id", req.params.bikeId);
    return res.json({ success: true, message: "Bike sent to maintenance" });
  } catch (error) {
    console.error("[admin.sendBikeToMaintenance] failed", error);
    return res.status(500).json({ success: false, message: "Unable to send bike to maintenance" });
  }
}

export async function disableBike(req, res) {
  try {
    await supabase.from("bikes").update({ status: "offline" }).eq("id", req.params.bikeId);
    return res.json({ success: true, message: "Bike disabled" });
  } catch (error) {
    console.error("[admin.disableBike] failed", error);
    return res.status(500).json({ success: false, message: "Unable to disable bike" });
  }
}

export async function acceptOrder(req, res) {
  try {
    await supabase.from("orders").update({ status: "assigned" }).eq("id", req.params.orderId);
    return res.json({ success: true, message: "Order assigned" });
  } catch (error) {
    console.error("[admin.acceptOrder] failed", error);
    return res.status(500).json({ success: false, message: "Unable to accept order" });
  }
}

export async function rejectOrder(req, res) {
  try {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", req.params.orderId);
    return res.json({ success: true, message: "Order cancelled" });
  } catch (error) {
    console.error("[admin.rejectOrder] failed", error);
    return res.status(500).json({ success: false, message: "Unable to reject order" });
  }
}

export async function assignOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { partnerId, partnerName } = req.body;
    await supabase
      .from("orders")
      .update({
        status: "assigned",
        assigned_user_id: partnerId || null,
        assigned_partner_name: partnerName || `Partner ${partnerId || ""}`.trim(),
      })
      .eq("id", orderId);
    if (partnerId) {
      partnerState[partnerId] = {
        ...(partnerState[partnerId] || {}),
        userId: partnerId,
        name: partnerName || partnerState[partnerId]?.name || `Partner ${partnerId}`,
        currentOrderId: orderId,
        online: true,
      };
    }
    return res.json({ success: true, message: "Delivery partner assigned" });
  } catch (error) {
    console.error("[admin.assignOrder] failed", error);
    return res.status(500).json({ success: false, message: "Unable to assign delivery partner" });
  }
}

export async function markOrderOngoing(req, res) {
  try {
    await supabase.from("orders").update({ status: "ongoing" }).eq("id", req.params.orderId);
    return res.json({ success: true, message: "Order marked ongoing" });
  } catch (error) {
    console.error("[admin.markOrderOngoing] failed", error);
    return res.status(500).json({ success: false, message: "Unable to update order" });
  }
}

export async function markOrderCompleted(req, res) {
  try {
    await supabase.from("orders").update({ status: "completed" }).eq("id", req.params.orderId);
    return res.json({ success: true, message: "Order marked completed" });
  } catch (error) {
    console.error("[admin.markOrderCompleted] failed", error);
    return res.status(500).json({ success: false, message: "Unable to complete order" });
  }
}

export async function approvePartner(req, res) {
  try {
    const { userId } = req.params;
    // 1. Update applications table
    await supabase.from("delivery_partners").update({ status: "approved" }).eq("user_id", userId);
    // 2. Update user profile
    await supabase.from("profiles").update({ is_delivery_partner: true, is_online: true }).eq("id", userId);
    return res.json({ success: true, message: "Partner approved" });
  } catch (error) {
    console.error("[admin.approvePartner] failed", error);
    return res.status(500).json({ success: false, message: "Unable to approve partner" });
  }
}

export async function rejectPartner(req, res) {
  try {
    const { userId } = req.params;
    await supabase.from("delivery_partners").update({ status: "rejected" }).eq("user_id", userId);
    await supabase.from("profiles").update({ is_delivery_partner: false, is_online: false }).eq("id", userId);
    return res.json({ success: true, message: "Partner rejected" });
  } catch (error) {
    console.error("[admin.rejectPartner] failed", error);
    return res.status(500).json({ success: false, message: "Unable to reject partner" });
  }
}

export async function togglePartnerOnline(req, res) {
  try {
    const { userId } = req.params;
    const targetOnline = req.body.isOnline === true || req.body.isOnline === "true";
    partnerState[userId] = { ...(partnerState[userId] || {}), online: targetOnline, disabled: false };
    await supabase.from("users").update({ is_online: targetOnline }).eq("id", userId);
    return res.json({ success: true, message: `Partner is now ${targetOnline ? "online" : "offline"}` });
  } catch (error) {
    console.error("[admin.togglePartnerOnline] failed", error);
    return res.status(500).json({ success: false, message: "Unable to update partner status" });
  }
}

export async function assignOrderToPartner(req, res) {
  try {
    const { userId } = req.params;
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order is required" });
    }
    await supabase
      .from("orders")
      .update({ assigned_user_id: userId, status: "accepted" })
      .eq("id", orderId);
    partnerState[userId] = {
      ...(partnerState[userId] || {}),
      currentOrderId: orderId,
      online: true,
      disabled: false,
    };
    return res.json({ success: true, message: "Order assigned successfully" });
  } catch (error) {
    console.error("[admin.assignOrderToPartner] failed", error);
    return res.status(500).json({ success: false, message: "Unable to assign order" });
  }
}

export async function disablePartner(req, res) {
  try {
    const { userId } = req.params;
    partnerState[userId] = { ...(partnerState[userId] || {}), disabled: true, online: false };
    await supabase
      .from("users")
      .update({ is_online: false, is_delivery_partner: false })
      .eq("id", userId);
    return res.json({ success: true, message: "Partner disabled" });
  } catch (error) {
    console.error("[admin.disablePartner] failed", error);
    return res.status(500).json({ success: false, message: "Unable to disable partner" });
  }
}

export async function markBikeFixed(req, res) {
  try {
    const { bikeId } = req.params;
    await supabase.from("bikes").update({ status: "available" }).eq("id", bikeId);
    const ticket = maintenanceTickets.find((item) => item.bikeId === bikeId);
    if (ticket) {
      ticket.status = "completed";
      ticket.fixedDate = new Date().toISOString().slice(0, 10);
    }
    return res.json({ success: true, message: "Bike marked as fixed" });
  } catch (error) {
    console.error("[admin.markBikeFixed] failed", error);
    return res.status(500).json({ success: false, message: "Unable to update bike" });
  }
}

export async function addMaintenanceTicket(req, res) {
  try {
    const bike = req.body.bikeId ? JSON.parse(req.body.bikeId) : null;
    const ticket = {
      id: `MT-${1000 + maintenanceTickets.length + 1}`,
      bikeId: bike?.id || `bike-${maintenanceTickets.length + 1}`,
      bikeCode: bike?.bike_code || "BIKE-NEW",
      issueType: req.body.issueType || "General Check",
      description: req.body.description || "No details",
      status: "under_repair",
      technicianName: req.body.technicianName || "Unassigned",
      repairCost: Number(req.body.repairCost || 0),
      reportedDate: req.body.reportedDate || new Date().toISOString().slice(0, 10),
      expectedFixDate: req.body.expectedFixDate || new Date().toISOString().slice(0, 10),
      fixedDate: null,
    };
    maintenanceTickets.unshift(ticket);
    if (bike?.id) {
      await supabase.from("bikes").update({ status: "maintenance" }).eq("id", bike.id);
    }
    return res.json({ success: true, message: "Bike added to maintenance" });
  } catch (error) {
    console.error("[admin.addMaintenanceTicket] failed", error);
    return res.status(500).json({ success: false, message: "Unable to add maintenance ticket" });
  }
}

export async function updateMaintenanceStatus(req, res) {
  try {
    const ticket = maintenanceTickets.find((item) => item.id === req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    ticket.status = req.body.status || ticket.status;
    ticket.technicianName = req.body.technicianName || ticket.technicianName;
    ticket.repairCost = Number(req.body.repairCost || ticket.repairCost);
    ticket.expectedFixDate = req.body.expectedFixDate || ticket.expectedFixDate;
    if (ticket.status === "completed") {
      ticket.fixedDate = new Date().toISOString().slice(0, 10);
      await supabase.from("bikes").update({ status: "available" }).eq("id", ticket.bikeId);
    }
    return res.json({ success: true, message: "Maintenance status updated" });
  } catch (error) {
    console.error("[admin.updateMaintenanceStatus] failed", error);
    return res.status(500).json({ success: false, message: "Unable to update maintenance status" });
  }
}

export async function removeMaintenanceTicket(req, res) {
  try {
    const idx = maintenanceTickets.findIndex((item) => item.id === req.params.ticketId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    const [ticket] = maintenanceTickets.splice(idx, 1);
    if (ticket.status !== "completed") {
      await supabase.from("bikes").update({ status: "available" }).eq("id", ticket.bikeId);
    }
    return res.json({ success: true, message: "Maintenance ticket removed" });
  } catch (error) {
    console.error("[admin.removeMaintenanceTicket] failed", error);
    return res.status(500).json({ success: false, message: "Unable to remove ticket" });
  }
}

export async function sendNotification(req, res) {
  console.log("[admin.notification] sent", req.body);
  return res.json({ success: true, message: "Notification sent" });
}

export async function saveSettings(req, res) {
  const payload = req.body || {};
  const booleans = new Set([
    "codEnabled",
    "onlinePaymentEnabled",
    "otpLoginEnabled",
    "pushEnabled",
    "smsEnabled",
    "emailEnabled",
    "maintenanceMode",
    "debugMode",
  ]);
  const numbers = new Set([
    "minimumWalletBalance",
    "bikePricePerHour",
    "minimumRentalTime",
    "lateFeePerHour",
    "securityDeposit",
    "deliveryCharges",
    "perKmCharge",
    "maxDeliveryDistance",
    "sessionTimeout",
  ]);

  for (const [key, value] of Object.entries(payload)) {
    if (!(key in dashboardSettings)) continue;
    if (booleans.has(key)) {
      dashboardSettings[key] = value === true || value === "true" || value === "on";
      continue;
    }
    if (numbers.has(key)) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) dashboardSettings[key] = parsed;
      continue;
    }
    dashboardSettings[key] = value;
  }

  return res.json({ success: true, message: "Settings saved", settings: dashboardSettings });
}
