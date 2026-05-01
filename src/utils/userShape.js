/**
 * Canonical user payload for API + admin UI (matches Supabase `profiles`).
 * Do not rename keys without updating frontend + admin templates.
 */
export function shapePublicUser(row) {
  if (!row || typeof row !== "object") return row;
  return {
    id: row.id,
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    location: row.location ?? null,
    image_url: row.image_url ?? null,
    created_at: row.created_at ?? null,
  };
}
