import supabase from "../utils/supabaseClient.js";

export const createBooking = async (req, res) => {
  try {
    const {
      user_id,
      bike_id,
      duration,
      start_time,
      end_time,
      price,
      status = "active",
    } = req.body ?? {};

    if (!user_id || !bike_id || !duration || !start_time || !end_time || price == null) {
      return res.status(400).json({ message: "Missing required booking fields" });
    }

    const payload = {
      user_id,
      bike_id,
      duration,
      start_time,
      end_time,
      price,
      status,
    };

    const { data, error } = await supabase.from("bookings").insert([payload]).select();

    if (error) {
      return res.status(500).json({ message: error.message, code: error.code });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getBookingsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message, code: error.code });
    }

    return res.status(200).json(data ?? []);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
