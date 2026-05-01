import { Router } from "express";
import supabase from "../utils/supabaseClient.js";

/** Read-only JSON list for admin / client dashboards (matches GET /api/users shape). */
const router = Router();

router.get("/", async (req, res) => {
  const { data, error } = await supabase.from("bikes").select("*");
  if (error) {
    console.error("[getBikes]", error);
    return res.status(500).json({ message: "Select failed", error });
  }
  res.json(data ?? []);
});

export default router;
