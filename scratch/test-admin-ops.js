import dotenv from "dotenv";
dotenv.config();

import supabase from "../src/utils/supabaseClient.js";
import bcrypt from "bcryptjs";

async function testAdminOperations() {
  console.log("=========================================");
  console.log("🧪 STARTING DB SUB-ADMIN CRUD TEST SUITE 🧪");
  console.log("=========================================");

  const testEmail = "test_crud_admin_2026@gmail.com";
  let createdAdminId = null;

  try {
    // 1. CLEANUP PREVIOUS RUNS IF ANY
    console.log("🧹 Cleaning up old test data if present...");
    await supabase.from("admin_users").delete().eq("email", testEmail);

    // 2. CREATE (Insert new Sub-Admin)
    console.log("\n➕ 1. Testing Sub-Admin Creation...");
    const password_hash = await bcrypt.hash("securepass123", 10);
    const newAdmin = {
      email: testEmail,
      full_name: "Test CRUD Admin",
      password_hash,
      role: "sub_admin",
      permissions: ["manage_users", "manage_support"],
      is_active: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from("admin_users")
      .insert([newAdmin])
      .select();

    if (insertError) {
      throw new Error(`Failed to create test admin: ${insertError.message}`);
    }

    const createdAdmin = insertData[0];
    createdAdminId = createdAdmin.id;
    console.log("✅ Sub-Admin created successfully!");
    console.log(`  - ID: ${createdAdmin.id}`);
    console.log(`  - Email: ${createdAdmin.email}`);
    console.log(`  - Role: ${createdAdmin.role}`);
    console.log(`  - Permissions: ${JSON.stringify(createdAdmin.permissions)}`);

    // 3. READ (Fetch and Validate)
    console.log("\n🔍 2. Testing Sub-Admin Fetching...");
    const { data: fetchData, error: fetchError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", createdAdminId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch created admin: ${fetchError.message}`);
    }

    if (fetchData.full_name === "Test CRUD Admin" && fetchData.permissions.includes("manage_users")) {
      console.log("✅ Sub-Admin details fetched and validated successfully!");
    } else {
      throw new Error("Fetched sub-admin data mismatch!");
    }

    // 4. UPDATE (Edit Sub-Admin)
    console.log("\n✏️ 3. Testing Sub-Admin Details & Permissions Editing...");
    const updates = {
      full_name: "Updated CRUD Admin Name",
      role: "manager",
      permissions: ["manage_users", "manage_support", "manage_bikes"] // added fleet control
    };

    const { data: updateData, error: updateError } = await supabase
      .from("admin_users")
      .update(updates)
      .eq("id", createdAdminId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update sub-admin: ${updateError.message}`);
    }

    if (updateData.full_name === "Updated CRUD Admin Name" && updateData.role === "manager" && updateData.permissions.includes("manage_bikes")) {
      console.log("✅ Sub-Admin updated successfully!");
      console.log(`  - New Name: ${updateData.full_name}`);
      console.log(`  - New Role: ${updateData.role}`);
      console.log(`  - New Permissions: ${JSON.stringify(updateData.permissions)}`);
    } else {
      throw new Error("Updated sub-admin data mismatch!");
    }

    // 5. TOGGLE (Block / Unblock status)
    console.log("\n🔒 4. Testing Sub-Admin Block Status Toggle...");
    
    // Block the admin
    const { data: blockData, error: blockError } = await supabase
      .from("admin_users")
      .update({ is_active: false })
      .eq("id", createdAdminId)
      .select()
      .single();

    if (blockError) {
      throw new Error(`Failed to block admin: ${blockError.message}`);
    }

    if (blockData.is_active === false) {
      console.log("✅ Blocked sub-admin successfully!");
    } else {
      throw new Error("Failed to toggle admin status to blocked!");
    }

    // Unblock the admin
    const { data: unblockData, error: unblockError } = await supabase
      .from("admin_users")
      .update({ is_active: true })
      .eq("id", createdAdminId)
      .select()
      .single();

    if (unblockError) {
      throw new Error(`Failed to unblock admin: ${unblockError.message}`);
    }

    if (unblockData.is_active === true) {
      console.log("✅ Unblocked sub-admin successfully!");
    } else {
      throw new Error("Failed to toggle admin status to unblocked!");
    }

    // 6. DELETE (Clean up)
    console.log("\n🗑️ 5. Cleaning up temporary CRUD test data...");
    const { error: deleteError } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", createdAdminId);

    if (deleteError) {
      throw new Error(`Cleanup failed: ${deleteError.message}`);
    }
    console.log("✅ Test database cleaned up successfully!");

    console.log("\n=========================================");
    console.log("🏁   ALL SUB-ADMIN CRUD TESTS PASSED!    🏁");
    console.log("=========================================");

  } catch (err) {
    console.error("\n❌ Test Suite Failed! Error Details:", err.message);
    // Cleanup on error
    if (createdAdminId) {
      await supabase.from("admin_users").delete().eq("id", createdAdminId);
    }
  }
}

testAdminOperations();
