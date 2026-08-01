import supabase from "./src/utils/supabaseClient.js";

async function testAdvancedDeduplication() {
  const { data: usersData } = await supabase.from("users").select("*");
  const users = (usersData || []).filter(r => !r.is_delivery_partner);

  console.log(`Raw users count in DB: ${users.length}`);

  // Compute info completeness score
  const computeInfoScore = (u) => {
    let score = 0;
    if (u.phone && String(u.phone).trim() && u.phone !== "null" && u.phone !== "N/A") score += 20;
    if (u.location && String(u.location).trim() && u.location !== "None" && u.location !== "N/A") score += 15;
    if (u.address && String(u.address).trim() && u.address !== "None" && u.address !== "N/A") score += 15;
    if (u.email && !u.email.endsWith("@app.local")) score += 10;
    if (u.image_url) score += 5;
    return score;
  };

  // Union-Find / Grouping logic
  // Two user objects belong to the same cluster if they share:
  // - Same valid non-app.local email OR
  // - Same valid 10-digit phone number OR
  // - Same normalized full_name
  
  const clusters = []; // Array of arrays of user objects

  const getNormEmail = (u) => {
    const email = (u.email || "").trim().toLowerCase();
    return email && !email.endsWith("@app.local") ? email : null;
  };

  const getNormPhone = (u) => {
    const raw = (u.phone || "").replace(/\D/g, "");
    return raw.length >= 10 ? raw.slice(-10) : null;
  };

  const getNormName = (u) => {
    const name = (u.full_name || u.name || "").trim().toLowerCase();
    return name && name !== "user" && name.length > 2 ? name : null;
  };

  for (const u of users) {
    const email = getNormEmail(u);
    const phone = getNormPhone(u);
    const name = getNormName(u);

    // Find any existing cluster that matches email, phone, or name
    const matchingClusters = clusters.filter(cluster => 
      cluster.some(item => {
        const itemEmail = getNormEmail(item);
        const itemPhone = getNormPhone(item);
        const itemName = getNormName(item);

        if (email && itemEmail && email === itemEmail) return true;
        if (phone && itemPhone && phone === itemPhone) return true;
        if (name && itemName && name === itemName) return true;
        return false;
      })
    );

    if (matchingClusters.length === 0) {
      clusters.push([u]);
    } else if (matchingClusters.length === 1) {
      matchingClusters[0].push(u);
    } else {
      // Merge multiple matching clusters into one
      const merged = [u];
      matchingClusters.forEach(c => {
        merged.push(...c);
        const idx = clusters.indexOf(c);
        if (idx !== -1) clusters.splice(idx, 1);
      });
      clusters.push(merged);
    }
  }

  console.log(`Cluster count (deduplicated users): ${clusters.length}`);

  const finalUsers = clusters.map(cluster => {
    // Sort cluster by info score descending
    cluster.sort((a, b) => computeInfoScore(b) - computeInfoScore(a));
    const winner = { ...cluster[0] };
    
    // Merge missing fields from remaining items in cluster
    for (let i = 1; i < cluster.length; i++) {
      const loser = cluster[i];
      if ((!winner.phone || winner.phone === "null" || winner.phone === "N/A") && loser.phone && loser.phone !== "null" && loser.phone !== "N/A") {
        winner.phone = loser.phone;
      }
      if ((!winner.location || winner.location === "None" || winner.location === "N/A") && loser.location && loser.location !== "None" && loser.location !== "N/A") {
        winner.location = loser.location;
      }
      if ((!winner.email || winner.email.endsWith("@app.local")) && loser.email && !loser.email.endsWith("@app.local")) {
        winner.email = loser.email;
      }
    }
    return winner;
  });

  const prakashList = finalUsers.filter(u => (u.email || "").includes("prakashfz83") || (u.full_name || "").toLowerCase().includes("prakash"));
  console.log("\n--- PRAKASH DEDUPLICATION RESULT ---");
  prakashList.forEach(u => {
    console.log(`- ID: ${u.id} | Name: ${u.full_name} | Email: ${u.email} | Phone: ${u.phone} | Location: ${u.location || u.address}`);
  });
}

testAdvancedDeduplication().then(() => process.exit(0));
