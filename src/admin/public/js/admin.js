function showToast(message, type = "success") {
  const host = document.getElementById("toast-container");
  if (!host) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function supportTicketLabel(t) {
  if (!t) return "—";
  if (t.ticket_number != null && t.ticket_number !== undefined) return "#" + String(t.ticket_number);
  return "—";
}
function supportTicketCopyValue(t) {
  if (!t) return "";
  if (t.ticket_number != null && t.ticket_number !== undefined) return String(t.ticket_number);
  return "";
}

async function handleAction(url, method = "POST", body = null) {
  const adminToken = localStorage.getItem("adminToken");
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin/login";
    return;
  }
  const data = await res.json().catch(() => ({ success: false, message: "Action failed" }));
  if (!res.ok || !data.success) {
    showToast(data.message || "Action failed", "error");
    return;
  }
  showToast(data.message || "Success");
  setTimeout(() => window.location.reload(), 500);
}

document.querySelectorAll(".admin-action").forEach((btn) => {
  btn.addEventListener("click", () => {
    handleAction(btn.dataset.url, btn.dataset.method || "POST");
  });
});

document.querySelectorAll("[data-modal-target]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modal = document.getElementById(btn.dataset.modalTarget);
    if (modal) modal.classList.add("show");
  });
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
  });
});

document.querySelectorAll(".ajax-form").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.classList.add("loading");
      submitBtn.textContent = form.dataset.loadingText || "Saving...";
    }
    const payload = Object.fromEntries(new FormData(form).entries());
    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      payload[checkbox.name] = checkbox.checked;
    });
    form.querySelectorAll('input[type="file"]').forEach((fileInput) => {
      payload[fileInput.name] = fileInput.files?.length ? fileInput.files[0].name : "";
    });
    await handleAction(form.dataset.url, "POST", payload);
    if (submitBtn) {
      submitBtn.classList.remove("loading");
      submitBtn.textContent = originalText;
    }
    const modal = form.closest(".modal");
    if (modal) modal.classList.remove("show");
  });
});

document.querySelectorAll(".open-edit-user").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modal = document.getElementById("edit-user-modal");
    const form = document.getElementById("edit-user-form");
    if (!modal || !form) return;
    const fullNameEl = document.getElementById("edit-user-full-name");
    if (fullNameEl) fullNameEl.value = btn.dataset.fullName || "";
    document.getElementById("edit-user-phone").value = btn.dataset.phone || "";
    const emailInput = document.getElementById("edit-user-email");
    if (emailInput) emailInput.value = btn.dataset.email || "";
    const locationInput = document.getElementById("edit-user-location");
    if (locationInput) locationInput.value = btn.dataset.location || "";
    form.dataset.url = `/admin/users/${btn.dataset.id}/edit`;
    modal.classList.add("show");
  });
});

document.querySelectorAll(".open-maintenance-status").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modal = document.getElementById("update-maintenance-modal");
    const form = document.getElementById("update-maintenance-form");
    if (!modal || !form) return;
    form.dataset.url = `/admin/maintenance/${btn.dataset.id}/status`;
    const statusEl = document.getElementById("maintenance-status");
    const techEl = document.getElementById("maintenance-tech");
    const costEl = document.getElementById("maintenance-cost");
    const expectedEl = document.getElementById("maintenance-expected");
    if (statusEl) statusEl.value = btn.dataset.status || "under_repair";
    if (techEl) techEl.value = btn.dataset.tech || "";
    if (costEl) costEl.value = btn.dataset.cost || "";
    if (expectedEl) expectedEl.value = btn.dataset.expected || "";
    modal.classList.add("show");
  });
});

document.querySelectorAll(".open-delivery-docs").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modal = document.getElementById("delivery-doc-modal");
    if (!modal) return;
    const license = document.getElementById("doc-license");
    const aadhar = document.getElementById("doc-aadhar");
    const photo = document.getElementById("doc-photo");
    const licenseImg = document.getElementById("doc-license-img");
    const aadharImg = document.getElementById("doc-aadhar-img");
    const photoImg = document.getElementById("doc-photo-img");
    const licenseUrl = btn.dataset.licenseUrl || "#";
    const aadharUrl = btn.dataset.aadharUrl || "#";
    const photoUrl = btn.dataset.photoUrl || "#";
    if (license) license.href = licenseUrl || "#";
    if (aadhar) aadhar.href = aadharUrl || "#";
    if (photo) photo.href = photoUrl || "#";
    if (licenseImg) licenseImg.src = licenseUrl || "";
    if (aadharImg) aadharImg.src = aadharUrl || "";
    if (photoImg) photoImg.src = photoUrl || "";
    modal.classList.add("show");
  });
});

document.querySelectorAll(".delivery-status-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.id;
    const status = btn.dataset.status;
    if (!id || !status) return;
    await handleAction(`/api/admin/delivery/${id}`, "PATCH", { status });
  });
});

document.querySelectorAll(".kyc-status-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.id;
    const status = btn.dataset.status;
    if (!id || !status) return;
    let reason = null;
    if (status === "rejected") {
      reason = window.prompt("Reject reason (optional):", "") || "";
    }
    await handleAction(`/api/admin/kyc/${id}`, "PATCH", { status, reason });
  });
});

document.querySelectorAll(".support-status-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.id;
    const status = btn.dataset.status;
    if (!id || !status) return;
    await handleAction(`/api/admin/support/${id}`, "PUT", { status });
  });
});

document.querySelectorAll(".support-convert-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.id;
    const modal = document.getElementById("support-convert-modal");
    const confirmBtn = document.getElementById("support-convert-confirm");
    if (!id || !modal || !confirmBtn) return;
    confirmBtn.dataset.ticketId = id;
    modal.classList.add("show");
  });
});

document.querySelectorAll(".copy-ticket-id").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const value = btn.dataset.value || "";
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast("Ticket ID copied");
    } catch {
      showToast("Unable to copy ticket ID", "error");
    }
  });
});

document.querySelectorAll(".support-view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modal = document.getElementById("support-view-modal");
    if (!modal) return;
    let ticket = {};
    try {
      ticket = JSON.parse((btn.dataset.ticket || "{}").replace(/&apos;/g, "'"));
    } catch {
      ticket = {};
    }
    document.getElementById("support-view-id").textContent = supportTicketLabel(ticket);
    document.getElementById("support-view-user").textContent = ticket.user_id || "-";
    document.getElementById("support-view-issue").textContent = ticket.issue_type || "-";
    document.getElementById("support-view-status").textContent = ticket.status || "-";
    document.getElementById("support-view-status-select").value = ticket.status || "pending";
    document.getElementById("support-view-update-btn").dataset.ticketId = ticket.id || "";
    document.getElementById("support-view-created").textContent =
      String(ticket.created_at || "").slice(0, 19).replace("T", " ") || "-";
    document.getElementById("support-view-desc").textContent = ticket.description || "-";
    const image = document.getElementById("support-view-image");
    const imageLink = document.getElementById("support-view-image-link");
    const hasImage = Boolean(ticket.image_url);
    if (image) {
      image.src = ticket.image_url || "";
      image.style.display = hasImage ? "block" : "none";
    }
    if (imageLink) {
      imageLink.href = ticket.image_url || "#";
      imageLink.style.display = hasImage ? "inline-flex" : "none";
    }
    modal.classList.add("show");
  });
});

const supportViewUpdateBtn = document.getElementById("support-view-update-btn");
if (supportViewUpdateBtn) {
  supportViewUpdateBtn.addEventListener("click", async () => {
    const id = supportViewUpdateBtn.dataset.ticketId;
    const status = document.getElementById("support-view-status-select")?.value || "pending";
    if (!id) return;
    await handleAction(`/api/admin/support/${id}`, "PUT", { status });
  });
}

const supportConvertConfirmBtn = document.getElementById("support-convert-confirm");
if (supportConvertConfirmBtn) {
  supportConvertConfirmBtn.addEventListener("click", async () => {
    const id = supportConvertConfirmBtn.dataset.ticketId;
    const modal = document.getElementById("support-convert-modal");
    if (!id) return;
    supportConvertConfirmBtn.classList.add("loading");
    await handleAction(`/admin/support/${id}/convert`, "POST");
    supportConvertConfirmBtn.classList.remove("loading");
    if (modal) modal.classList.remove("show");
  });
}

async function loadSupportTickets() {
  const tableRoot = document.getElementById("support-table-root");
  const tableBody = document.getElementById("support-table-body");
  if (!tableRoot || !tableBody) return;
  const filter = tableRoot.dataset.filter || "all";
  const search = tableRoot.dataset.search || "";
  const sort = tableRoot.dataset.sort || "newest";
  const adminToken = localStorage.getItem("adminToken");
  try {
    tableBody.innerHTML =
      '<tr><td colspan="8"><div class="chart-skeleton" style="height:56px;margin:0;"></div></td></tr>';
    const qs = new URLSearchParams({
      status: filter,
      search,
      sort,
    });
    const res = await fetch(`/api/admin/support?${qs.toString()}`, {
      headers: {
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
    });
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    console.log("Tickets from DB:", rows);

    document.getElementById("support-stat-total").textContent = String(rows.length);
    document.getElementById("support-stat-pending").textContent = String(
      rows.filter((x) => x.status === "pending").length
    );
    document.getElementById("support-stat-inprogress").textContent = String(
      rows.filter((x) => x.status === "in_progress").length
    );
    document.getElementById("support-stat-resolved").textContent = String(
      rows.filter((x) => x.status === "resolved").length
    );

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="empty">No support tickets found</td></tr>';
      return;
    }

    tableBody.innerHTML = rows
      .map((ticket) => {
        const badgeClass =
          ticket.status === "resolved" ? "success" : ticket.status === "in_progress" ? "warning" : "danger";
        const badgeLabel =
          ticket.status === "in_progress" ? "In Progress" : ticket.status === "resolved" ? "Resolved" : "Pending";
        const date = String(ticket.created_at || "").slice(0, 19).replace("T", " ");
        const preview = ticket.image_url
          ? `<img src="${ticket.image_url}" alt="ticket" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" />`
          : '<span class="table-subtext">No image</span>';
        const createdTs = new Date(ticket.created_at || Date.now());
        const diffSec = Math.max(1, Math.floor((Date.now() - createdTs.getTime()) / 1000));
        const relative =
          diffSec < 60
            ? `${diffSec}s ago`
            : diffSec < 3600
              ? `${Math.floor(diffSec / 60)}m ago`
              : diffSec < 86400
                ? `${Math.floor(diffSec / 3600)}h ago`
                : `${Math.floor(diffSec / 86400)}d ago`;
        const copyVal = (supportTicketCopyValue(ticket) || "").replace(/"/g, "&quot;");
        return `
          <tr>
            <td>${supportTicketLabel(ticket)} <button class="btn btn-ghost copy-ticket-id" data-value="${copyVal}">📋</button></td>
            <td>🛵 ${ticket.bike_name || "-"}</td>
            <td>
              <div><strong><span class="badge ${ticket.issue_type === "battery" ? "warning" : ticket.issue_type === "brake" ? "danger" : ticket.issue_type === "engine" ? "info" : "badge-soft"}">${ticket.issue_type || "-"}</span></strong></div>
              <div class="table-subtext" title="${ticket.description || ""}">${String(ticket.description || "-").slice(0, 64)}${String(ticket.description || "").length > 64 ? "..." : ""}</div>
            </td>
            <td>${String(ticket.user_id || "-").slice(0, 8)}</td>
            <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
            <td title="${date || "-"}">${relative || date || "-"}</td>
            <td>${preview}</td>
            <td class="actions">
              <button class="btn btn-outline support-view-btn" data-ticket='${JSON.stringify(ticket).replace(/'/g, "&apos;")}'>👁️ View</button>
              <button class="btn btn-info support-status-btn" data-id="${ticket.id}" data-status="in_progress">🔄 Progress</button>
              <button class="btn btn-success support-status-btn" data-id="${ticket.id}" data-status="resolved">✔ Resolve</button>
              <button class="btn btn-gradient support-convert-btn" data-id="${ticket.id}">⚙ Convert</button>
            </td>
          </tr>
        `;
      })
      .join("");

    tableBody.querySelectorAll(".support-status-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const status = btn.dataset.status;
        if (!id || !status) return;
        await handleAction(`/api/admin/support/${id}`, "PUT", { status });
      });
    });
    tableBody.querySelectorAll(".support-convert-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const modal = document.getElementById("support-convert-modal");
        const confirmBtn = document.getElementById("support-convert-confirm");
        if (!id || !modal || !confirmBtn) return;
        confirmBtn.dataset.ticketId = id;
        modal.classList.add("show");
      });
    });
    tableBody.querySelectorAll(".copy-ticket-id").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const value = btn.dataset.value || "";
        if (!value) return;
        await navigator.clipboard.writeText(value);
        showToast("Ticket ID copied");
      });
    });
    tableBody.querySelectorAll(".support-view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = document.getElementById("support-view-modal");
        if (!modal) return;
        let ticket = {};
        try {
          ticket = JSON.parse((btn.dataset.ticket || "").replace(/&apos;/g, "'"));
        } catch {
          ticket = {};
        }
        document.getElementById("support-view-id").textContent = supportTicketLabel(ticket);
        document.getElementById("support-view-user").textContent = ticket.user_id || "-";
        document.getElementById("support-view-issue").textContent = ticket.issue_type || "-";
        document.getElementById("support-view-status").textContent = ticket.status || "-";
        document.getElementById("support-view-status-select").value = ticket.status || "pending";
        document.getElementById("support-view-update-btn").dataset.ticketId = ticket.id || "";
        document.getElementById("support-view-created").textContent =
          String(ticket.created_at || "").slice(0, 19).replace("T", " ") || "-";
        document.getElementById("support-view-desc").textContent = ticket.description || "-";
        const image = document.getElementById("support-view-image");
        const imageLink = document.getElementById("support-view-image-link");
        const hasImage = Boolean(ticket.image_url);
        if (image) {
          image.src = ticket.image_url || "";
          image.style.display = hasImage ? "block" : "none";
        }
        if (imageLink) {
          imageLink.href = ticket.image_url || "#";
          imageLink.style.display = hasImage ? "inline-flex" : "none";
        }
        modal.classList.add("show");
      });
    });
  } catch (error) {
    console.log("Support load failed:", error);
    tableBody.innerHTML = '<tr><td colspan="8" class="empty">Unable to load support tickets</td></tr>';
  }
}

loadSupportTickets();

async function loadMaintenanceSupportTickets() {
  const tbody = document.getElementById("maintenance-support-body");
  if (!tbody) return;
  const adminToken = localStorage.getItem("adminToken");
  try {
    const res = await fetch("/api/admin/support?status=all", {
      headers: { ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) },
    });
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No support tickets found</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .slice(0, 20)
      .map((ticket) => {
        const badgeClass =
          ticket.status === "resolved" ? "success" : ticket.status === "in_progress" ? "warning" : "danger";
        const badgeLabel =
          ticket.status === "in_progress" ? "In Progress" : ticket.status === "resolved" ? "Resolved" : "Pending";
        const copyM = (supportTicketCopyValue(ticket) || "").replace(/"/g, "&quot;");
        return `<tr>
          <td>${supportTicketLabel(ticket)} <button class="btn btn-ghost copy-ticket-id" data-value="${copyM}">📋</button></td>
          <td><span class="badge badge-soft">${ticket.issue_type || "-"}</span></td>
          <td title="${ticket.description || ""}">${String(ticket.description || "-").slice(0, 60)}${String(ticket.description || "").length > 60 ? "..." : ""}</td>
          <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
          <td>${String(ticket.created_at || "").slice(0, 19).replace("T", " ")}</td>
        </tr>`;
      })
      .join("");
  } catch (e) {
    console.log("Maintenance support refresh failed:", e);
  }
}

loadMaintenanceSupportTickets();

setInterval(() => {
  loadSupportTickets();
  loadMaintenanceSupportTickets();
}, 10000);

function parseJsonScript(id) {
  const el = document.getElementById(id);
  if (!el) return [];
  try {
    return JSON.parse(el.textContent);
  } catch {
    return [];
  }
}

function renderLineChart(canvasId, labels, values, label, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  // eslint-disable-next-line no-new
  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: color,
          backgroundColor: "rgba(234,179,8,0.15)",
          tension: 0.35,
        },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: "#374151" } } },
      scales: {
        x: { ticks: { color: "#6b7280" }, grid: { color: "#e5e7eb" } },
        y: { ticks: { color: "#6b7280" }, grid: { color: "#e5e7eb" } },
      },
    },
  });
}

function renderBarChart(canvasId, labels, values, label, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  // eslint-disable-next-line no-new
  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color }],
    },
    options: {
      plugins: { legend: { labels: { color: "#374151" } } },
      scales: {
        x: { ticks: { color: "#6b7280" }, grid: { color: "#e5e7eb" } },
        y: { ticks: { color: "#6b7280" }, grid: { color: "#e5e7eb" } },
      },
    },
  });
}

function renderPieChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  // eslint-disable-next-line no-new
  new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#eab308", "#3b82f6"],
        },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: "#374151" } } },
    },
  });
}

const earningsSeries = parseJsonScript("earnings-chart-data");
if (earningsSeries.length) {
  renderLineChart(
    "earningsLineChart",
    earningsSeries.map((x) => x.label),
    earningsSeries.map((x) => x.value),
    "Revenue",
    "#ca8a04"
  );
}

const earningsPie = parseJsonScript("earnings-pie-data");
if (earningsPie.length) {
  renderPieChart(
    "earningsBreakdownChart",
    earningsPie.map((x) => x.label),
    earningsPie.map((x) => x.value)
  );
}

const analyticsEarnings = parseJsonScript("analytics-earnings-data");
if (analyticsEarnings.length) {
  renderLineChart(
    "revenueChart",
    analyticsEarnings.map((x) => x.label),
    analyticsEarnings.map((x) => x.value),
    "Revenue",
    "#ca8a04"
  );
}

const analyticsOrders = parseJsonScript("analytics-orders-data");
if (analyticsOrders.length) {
  renderLineChart(
    "ordersChart",
    analyticsOrders.map((x) => x.label),
    analyticsOrders.map((x) => x.value),
    "Orders",
    "#7aa2ff"
  );
}

const analyticsRevenue = parseJsonScript("analytics-revenue-data");
if (analyticsRevenue.length) {
  renderLineChart(
    "revenueChart",
    analyticsRevenue.map((x) => x.label),
    analyticsRevenue.map((x) => x.value),
    "Revenue",
    "#ca8a04"
  );
}

const analyticsOrdersBar = parseJsonScript("analytics-orders-bar-data");
if (analyticsOrdersBar.length) {
  renderBarChart(
    "ordersBarChart",
    analyticsOrdersBar.map((x) => x.label),
    analyticsOrdersBar.map((x) => x.value),
    "Orders",
    "rgba(122,162,255,0.7)"
  );
}

const analyticsPie = parseJsonScript("analytics-pie-data");
if (analyticsPie.length) {
  renderPieChart(
    "earningsPieChart",
    analyticsPie.map((x) => x.label),
    analyticsPie.map((x) => x.value)
  );
}

document.querySelectorAll(".chart-skeleton").forEach((el) => {
  el.style.display = "none";
});

const scheduleToggle = document.getElementById("schedule-toggle");
const scheduleFields = document.getElementById("schedule-fields");
if (scheduleToggle && scheduleFields) {
  const toggleScheduleFields = () => {
    scheduleFields.classList.toggle("hidden", !scheduleToggle.checked);
  };
  scheduleToggle.addEventListener("change", toggleScheduleFields);
  toggleScheduleFields();
}
