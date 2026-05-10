import supabase from "../utils/supabaseClient.js";

/**
 * Get all addresses for a user
 */
export async function getUserAddresses(userId) {
    const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get a single address by ID
 */
export async function getAddressById(addressId, userId) {
    const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", addressId)
        .eq("user_id", userId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create a new address
 */
export async function createAddress(userId, addressData) {
    const { name, address_line, city, pincode, is_default = false } = addressData;

    const { data, error } = await supabase
        .from("addresses")
        .insert([{
            user_id: userId,
            name,
            address_line,
            city,
            pincode,
            is_default,
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update an existing address
 */
export async function updateAddress(addressId, userId, addressData) {
    const { name, address_line, city, pincode, is_default } = addressData;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address_line !== undefined) updateData.address_line = address_line;
    if (city !== undefined) updateData.city = city;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (is_default !== undefined) updateData.is_default = is_default;

    const { data, error } = await supabase
        .from("addresses")
        .update(updateData)
        .eq("id", addressId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete an address
 */
export async function deleteAddress(addressId, userId) {
    const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId)
        .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
}

/**
 * Get default address for a user
 */
export async function getDefaultAddress(userId) {
    const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Set an address as default
 */
export async function setDefaultAddress(addressId, userId) {
    // The trigger will automatically unset other defaults
    const { data, error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}
