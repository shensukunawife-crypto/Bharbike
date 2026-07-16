import axios from "axios";

async function run() {
  const url = "https://storage.googleapis.com/eas-workflows-production/logs/f3340de0-b995-4955-a072-b6209c5a21b0/f2bc4f86-7db0-4827-b090-215dad609c76/2026-05-24T16%3A59%3A22Z-d34e3293-0a4b-45fd-bd90-fcbd16261402.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260524%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260524T181109Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=2704c1204e2986d95a621b85f7aae94ea9f4093efcf631c598c72e808555d0d267c00939815ac12dbd7c923f4d2341570015a0267dd5c1241d5d6844fb9485630078049698040a2dfaebb708a98965c78d06b096a83547ec131052eed1d32cb4a5bd8251f821cffa7b85e1fab841e5290082deb36d491e130c7887ee3d7a624775402f5a1fc9f50f46cac0242c7f48578d76cc423e545c6bdbbd2607db64a8951aadd7dea281e48c6b1c63459ce38ab8db08d7cf1635c0c03ea8096697d5799de47341955ebf810a2025a75afec0e8855a4466961af6799bbdf0d1d50048595775e4bddf2855d4823d4a4bb2150ecb19ca9ae0657b8ec23ce3bcc9e6da730028";
  
  console.log("=== DOWNLOADING AND SEARCHING LOG FILE ===");
  try {
    const res = await axios.get(url);
    const logs = res.data;
    
    // Find all lines containing SHA256 or SHA-256 (case insensitive)
    const lines = logs.split("\n");
    console.log("Total log lines:", lines.length);

    let found = false;
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes("sha256") || line.toLowerCase().includes("sha-256") || line.toLowerCase().includes("fingerprint")) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
        found = true;
      }
    });

    if (!found) {
      console.log("❌ SHA-256 fingerprint not found in log search.");
      // Print some lines from the signing step if we can find it
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes("signing") || line.toLowerCase().includes("keystore") || line.toLowerCase().includes("credential")) {
          console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }

  } catch (err) {
    console.error("❌ Failed to download logs:", err.message);
  }
}

run();
