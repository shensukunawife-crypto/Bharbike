import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function runTest() {
  console.log("🚀 Starting GPS Tracker Direct-Pairing Integration Test...");

  const testBikeCode1 = "TESTBIKE_999";
  const testBikeCode2 = "TESTBIKE_888";
  const testTracker1 = "TESTTRACKER_999";
  const testTracker2 = "TESTTRACKER_888";

  let bike1Id = null;
  let bike2Id = null;

  try {
    // 0. Cleanup existing test data if any from previous failed runs
    console.log("🧹 Cleaning up old test records...");
    const { data: oldBikes } = await supabase
      .from("bikes")
      .select("id")
      .in("bike_code", [testBikeCode1, testBikeCode2]);

    if (oldBikes?.length) {
      const ids = oldBikes.map(b => b.id);
      await supabase.from("vehicles").delete().in("bike_id", ids);
      await supabase.from("bikes").delete().in("id", ids);
    }
    await supabase.from("vehicles").delete().eq("vehicle_uuid", testTracker1);
    await supabase.from("vehicles").delete().eq("vehicle_uuid", testTracker2);

    console.log("✅ Cleanup done.");

    // 1. Create a bike with a tracker ID
    console.log(`\n1️⃣ Creating Bike 1 (${testBikeCode1}) with GPS Tracker (${testTracker1})...`);
    
    // Simulate addBike logic
    // A. Validate GPS not in use (should pass)
    const { data: existingMap1 } = await supabase
      .from("vehicles")
      .select("bike_id")
      .eq("vehicle_uuid", testTracker1)
      .maybeSingle();

    if (existingMap1) {
      throw new Error(`Tracker ${testTracker1} should not be in use!`);
    }
    console.log(`  - Validation passed: Tracker is free`);

    // B. Insert bike
    const { data: newBikes1, error: bikeError1 } = await supabase
      .from("bikes")
      .insert([
        {
          bike_code: testBikeCode1,
          name: testBikeCode1,
          status: "available",
          battery: 95,
          location: "Test Hub"
        }
      ])
      .select();

    if (bikeError1) throw bikeError1;
    bike1Id = newBikes1?.[0]?.id;
    console.log(`  - Bike 1 created in DB with ID: ${bike1Id}`);

    // C. Insert vehicle mapping
    const { error: vehicleError1 } = await supabase
      .from("vehicles")
      .insert([
        {
          bike_id: bike1Id,
          vehicle_uuid: testTracker1,
          status: "active"
        }
      ]);

    if (vehicleError1) throw vehicleError1;
    console.log(`  - Tracker linked in vehicles table successfully`);

    // 2. Fetch and Verify Mapping in bikeDetails simulation
    console.log(`\n2️⃣ Verifying Bike 1 details mapping fetch...`);
    const { data: bikeRow } = await supabase.from("bikes").select("*").eq("id", bike1Id).maybeSingle();
    const { data: vehicleMapping } = await supabase
      .from("vehicles")
      .select("vehicle_uuid")
      .eq("bike_id", bike1Id)
      .maybeSingle();

    console.log(`  - Bike Code: ${bikeRow.bike_code}`);
    console.log(`  - Mapped Tracker UUID: ${vehicleMapping?.vehicle_uuid}`);
    if (vehicleMapping?.vehicle_uuid !== testTracker1) {
      throw new Error("Tracker mapping mismatch!");
    }
    console.log(`  - Success: Mapped Tracker UUID matches expected value`);

    // 3. Create Bike 2 and try to link it to the SAME tracker (Validation failure expected)
    console.log(`\n3️⃣ Creating Bike 2 and attempting to map to already linked Tracker (${testTracker1})...`);
    
    // Simulate duplicate validation
    const { data: existingMap2 } = await supabase
      .from("vehicles")
      .select("bike_id")
      .eq("vehicle_uuid", testTracker1)
      .maybeSingle();

    if (existingMap2) {
      const { data: otherBike } = await supabase
        .from("bikes")
        .select("bike_code")
        .eq("id", existingMap2.bike_id)
        .maybeSingle();
      const otherCode = otherBike ? otherBike.bike_code : existingMap2.bike_id;
      console.log(`  - Expected validation error caught: GPS Tracker is already mapped to Bike: ${otherCode}`);
    } else {
      throw new Error("Validation failed: did not catch duplicate GPS mapping!");
    }

    // 4. Update GPS link inline (Link / Update GPS simulation)
    console.log(`\n4️⃣ Testing inline Tracker change for Bike 1 (Linking to ${testTracker2})...`);
    
    // A. Validate new tracker not in use (should pass)
    const { data: existingMap3 } = await supabase
      .from("vehicles")
      .select("bike_id")
      .eq("vehicle_uuid", testTracker2)
      .maybeSingle();
    
    if (existingMap3 && existingMap3.bike_id !== bike1Id) {
      throw new Error(`Tracker ${testTracker2} should be free!`);
    }

    // B. Delete old mappings
    await supabase.from("vehicles").delete().eq("bike_id", bike1Id);
    console.log(`  - Unlinked old tracker for Bike 1`);

    // C. Insert new mapping
    const { error: vehicleError2 } = await supabase.from("vehicles").insert([
      {
        bike_id: bike1Id,
        vehicle_uuid: testTracker2,
        status: "active"
      }
    ]);
    if (vehicleError2) throw vehicleError2;
    console.log(`  - Linked Bike 1 to Tracker 2 (${testTracker2})`);

    // Verify change
    const { data: vehicleMapping2 } = await supabase
      .from("vehicles")
      .select("vehicle_uuid")
      .eq("bike_id", bike1Id)
      .maybeSingle();

    console.log(`  - Verified new Mapped Tracker: ${vehicleMapping2?.vehicle_uuid}`);
    if (vehicleMapping2?.vehicle_uuid !== testTracker2) {
      throw new Error("Tracker mapping update failed!");
    }
    console.log(`  - Success: Mapped Tracker successfully updated`);

    // 5. Test Unlinking (Empty UUID)
    console.log(`\n5️⃣ Testing unlinking (passing empty tracker UUID) for Bike 1...`);
    await supabase.from("vehicles").delete().eq("bike_id", bike1Id);
    console.log(`  - Unlinked tracker for Bike 1`);

    const { data: vehicleMapping3 } = await supabase
      .from("vehicles")
      .select("vehicle_uuid")
      .eq("bike_id", bike1Id)
      .maybeSingle();

    console.log(`  - Verified Mapped Tracker: ${vehicleMapping3?.vehicle_uuid || "None"}`);
    if (vehicleMapping3) {
      throw new Error("Tracker unlinking failed!");
    }
    console.log(`  - Success: Tracker cleanly unlinked`);

  } catch (error) {
    console.error("❌ Test Failed:", error.message);
    process.exit(1);
  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up test records from database...");
    if (bike1Id) {
      await supabase.from("vehicles").delete().eq("bike_id", bike1Id);
      await supabase.from("bikes").delete().eq("id", bike1Id);
    }
    if (bike2Id) {
      await supabase.from("vehicles").delete().eq("bike_id", bike2Id);
      await supabase.from("bikes").delete().eq("id", bike2Id);
    }
    console.log("🎉 Test completed successfully!");
    process.exit(0);
  }
}

runTest();
