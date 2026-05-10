import { asyncHandler } from "../utils/asyncHandler.js";
import * as addressService from "../services/addressService.js";

/**
 * Get all addresses for authenticated user
 * GET /api/addresses
 */
export const getAddresses = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addresses = await addressService.getUserAddresses(userId);

    res.json({
        success: true,
        data: addresses,
    });
});

/**
 * Get a single address by ID
 * GET /api/addresses/:id
 */
export const getAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const address = await addressService.getAddressById(id, userId);

    res.json({
        success: true,
        data: address,
    });
});

/**
 * Create a new address
 * POST /api/addresses
 */
export const createAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, address_line, city, pincode, is_default } = req.body;

    if (!name || !address_line || !city || !pincode) {
        return res.status(400).json({
            success: false,
            message: "Name, address_line, city, and pincode are required",
        });
    }

    const address = await addressService.createAddress(userId, {
        name,
        address_line,
        city,
        pincode,
        is_default: is_default || false,
    });

    res.status(201).json({
        success: true,
        data: address,
        message: "Address created successfully",
    });
});

/**
 * Update an existing address
 * PUT /api/addresses/:id
 */
export const updateAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, address_line, city, pincode, is_default } = req.body;

    const address = await addressService.updateAddress(id, userId, {
        name,
        address_line,
        city,
        pincode,
        is_default,
    });

    res.json({
        success: true,
        data: address,
        message: "Address updated successfully",
    });
});

/**
 * Delete an address
 * DELETE /api/addresses/:id
 */
export const deleteAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    await addressService.deleteAddress(id, userId);

    res.json({
        success: true,
        message: "Address deleted successfully",
    });
});

/**
 * Get default address
 * GET /api/addresses/default
 */
export const getDefaultAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const address = await addressService.getDefaultAddress(userId);

    res.json({
        success: true,
        data: address,
    });
});

/**
 * Set an address as default
 * PATCH /api/addresses/:id/default
 */
export const setDefaultAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const address = await addressService.setDefaultAddress(id, userId);

    res.json({
        success: true,
        data: address,
        message: "Default address updated",
    });
});
