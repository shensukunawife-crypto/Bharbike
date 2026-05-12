import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testUpload() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  
  console.log("Testing upload to:", url);
  console.log("Using key:", key?.slice(0, 10) + "...");
  
  const supabase = createClient(url, key);
  
  const testData = Buffer.from("test content", "utf-8");
  const fileName = `test-${Date.now()}.txt`;
  
  const { data, error } = await supabase.storage
    .from("support-tickets")
    .upload(fileName, testData, { contentType: "text/plain" });
    
  if (error) {
    console.error("Upload failed:", error);
  } else {
    console.log("Upload success:", data);
    const { data: publicData } = supabase.storage.from("support-tickets").getPublicUrl(data.path);
    console.log("Public URL:", publicData.publicUrl);
  }
}

testUpload();
