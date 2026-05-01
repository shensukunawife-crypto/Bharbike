import { randomUUID } from "crypto";

const deliveryApplications = [];

export function addDeliveryApplication(payload) {
  const row = {
    id: randomUUID(),
    status: "pending",
    created_at: new Date().toISOString(),
    ...payload,
  };
  deliveryApplications.unshift(row);
  return row;
}

export function listDeliveryApplications() {
  return [...deliveryApplications];
}

export function updateDeliveryApplicationStatus(id, status) {
  const idx = deliveryApplications.findIndex((row) => String(row.id) === String(id));
  if (idx === -1) return null;
  deliveryApplications[idx] = { ...deliveryApplications[idx], status };
  return deliveryApplications[idx];
}
