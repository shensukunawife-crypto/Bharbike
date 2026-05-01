import { RealtimeEvents } from "./events.js";

/**
 * Placeholder for Socket.IO / ws / Supabase channel bridge.
 * Call `attachRealtime(httpServer)` when integrating a WebSocket library.
 */
export function attachRealtime(httpServer) {
  console.log(
    "[realtime] Hub ready — attach Socket.IO here. Events:",
    Object.values(RealtimeEvents).join(", ")
  );
  return { httpServer, RealtimeEvents };
}

export function broadcastBikeStatus(_io, payload) {
  console.log("[realtime] would broadcast bike status", payload);
}

export function broadcastOrderUpdate(_io, payload) {
  console.log("[realtime] would broadcast order update", payload);
}
