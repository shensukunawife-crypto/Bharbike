import { randomUUID } from "crypto";

const inMemoryBookings = [];

export function addInMemoryBooking(payload) {
  const booking = {
    id: randomUUID(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  inMemoryBookings.unshift(booking);
  return booking;
}

export function listInMemoryBookings() {
  return [...inMemoryBookings];
}
