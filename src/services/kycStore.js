import { randomUUID } from "crypto";

const kycDocs = [];

export function addKycDocument(payload) {
  const row = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    status: "pending",
    ...payload,
  };
  kycDocs.unshift(row);
  return row;
}

export function listKycDocuments() {
  return [...kycDocs];
}

export function updateKycDocument(id, status, reason = null) {
  const index = kycDocs.findIndex((doc) => String(doc.id) === String(id));
  if (index === -1) return null;
  kycDocs[index] = { ...kycDocs[index], status, reason };
  return kycDocs[index];
}

export function getLatestKycByUser(userId) {
  return kycDocs.find((doc) => String(doc.user_id) === String(userId)) || null;
}

export function getLatestKycByUserAndType(userId, type) {
  return (
    kycDocs.find((doc) => String(doc.user_id) === String(userId) && String(doc.type) === String(type)) || null
  );
}

export function listKycDocumentsByUser(userId) {
  return kycDocs.filter((doc) => String(doc.user_id) === String(userId));
}
