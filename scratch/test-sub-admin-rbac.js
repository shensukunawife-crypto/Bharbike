import dotenv from "dotenv";
dotenv.config();

import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import app from "../src/app.js";

// Make sure view engine matches
app.set("views", "./src/admin/views");

async function runTests() {
  console.log("=========================================");
  console.log("🛡️   STARTING RBAC SUB-ADMIN TEST SUITE  🛡️");
  console.log("=========================================");

  // Start the server on a random free port
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseURL = `http://localhost:${port}`;
    console.log(`🚀 Test server listening on dynamic port: ${port}`);

    try {
      const jwtSecret = process.env.JWT_SECRET || "BharBike_Secure_Session_2026_9e8d4f2a1b5c7d8e9f0a1b2c3d4e5f6g";
      
      // 1. Generate JWT tokens
      const masterToken = jwt.sign(
        { role: "master_admin", permissions: ["*"] },
        jwtSecret,
        { expiresIn: "1h" }
      );

      const noPermsToken = jwt.sign(
        { role: "sub_admin", admin_id: "test-sub-id", permissions: [] },
        jwtSecret,
        { expiresIn: "1h" }
      );

      const manageUsersToken = jwt.sign(
        { role: "manager", admin_id: "test-sub-id-2", permissions: ["manage_users"] },
        jwtSecret,
        { expiresIn: "1h" }
      );

      console.log("\n🔑 Generated test tokens successfully.");

      // Helper function to test an endpoint with a specific token
      async function testEndpoint(endpoint, token, expectedStatus, testName, method = "GET", postData = {}) {
        try {
          const config = {
            headers: {
              Cookie: `admin_token=${token}`
            }
          };

          let res;
          if (method === "GET") {
            res = await axios.get(`${baseURL}${endpoint}`, config);
          } else {
            res = await axios.post(`${baseURL}${endpoint}`, postData, config);
          }

          if (res.status === expectedStatus) {
            console.log(`✅ [${testName}] PASS - Got status ${res.status}`);
            return { pass: true, data: res.data, status: res.status };
          } else {
            console.error(`❌ [${testName}] FAIL - Got status ${res.status}, expected ${expectedStatus}`);
            return { pass: false, status: res.status };
          }
        } catch (error) {
          const status = error.response ? error.response.status : null;
          if (status === expectedStatus) {
            console.log(`✅ [${testName}] PASS - Got expected error status ${status}`);
            return { pass: true, data: error.response?.data, status };
          } else {
            console.error(`❌ [${testName}] FAIL - Got status ${status}, expected ${expectedStatus}. Error: ${error.message}`);
            return { pass: false, status };
          }
        }
      }

      console.log("\n--- Running Master Admin Tests (Should access everything) ---");
      await testEndpoint("/admin/dashboard", masterToken, 200, "Master: Dashboard Access");
      await testEndpoint("/admin/users", masterToken, 200, "Master: Users Page Access");
      await testEndpoint("/admin/bikes", masterToken, 200, "Master: Bikes Page Access");

      console.log("\n--- Running Restricted Sub-Admin Tests (No permissions) ---");
      await testEndpoint("/admin/dashboard", noPermsToken, 200, "Restricted: Dashboard Access (Allowed for all admins)");
      
      // Should get 403 Forbidden (rendered Access Denied page)
      const usersRes = await testEndpoint("/admin/users", noPermsToken, 403, "Restricted: Users Page Access (Blocked)");
      if (usersRes.pass && typeof usersRes.data === "string" && usersRes.data.includes("Access Denied")) {
        console.log("  ↳ verified beautiful rendered Access Denied HTML!");
      } else {
        console.error("  ↳ did not find 'Access Denied' in returned page content!");
      }

      await testEndpoint("/admin/bikes", noPermsToken, 403, "Restricted: Bikes Page Access (Blocked)");

      console.log("\n--- Running Manager Tests (Has 'manage_users' only) ---");
      await testEndpoint("/admin/dashboard", manageUsersToken, 200, "Manager: Dashboard Access");
      await testEndpoint("/admin/users", manageUsersToken, 200, "Manager: Users Page Access (Allowed)");
      await testEndpoint("/admin/bikes", manageUsersToken, 403, "Manager: Bikes Page Access (Blocked)");

      console.log("\n--- Running POST/API Security Tests ---");
      // POST requests should receive JSON errors rather than full HTML rendering
      const postNoPermsRes = await testEndpoint("/admin/users/add", noPermsToken, 403, "Restricted POST: Add User (Blocked)", "POST", { email: "newuser@gmail.com" });
      if (postNoPermsRes.pass && postNoPermsRes.data && postNoPermsRes.data.success === false) {
        console.log("  ↳ verified JSON response:", JSON.stringify(postNoPermsRes.data));
      } else {
        console.error("  ↳ failed to verify JSON response structure:", postNoPermsRes.data);
      }

      console.log("\n=========================================");
      console.log("🏁   SUB-ADMIN RBAC TEST COMPLETED!      🏁");
      console.log("=========================================");

    } catch (err) {
      console.error("Fatal test suite error:", err);
    } finally {
      server.close(() => {
        console.log("\n🔌 Test server shut down cleanly.");
      });
    }
  });
}

runTests();
