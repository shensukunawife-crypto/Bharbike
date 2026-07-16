import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ptrazrloxvknrjjelruw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cmF6cmxveHZrbnJqamVscnV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYzNjYwMywiZXhwIjoyMDkxMjEyNjAzfQ.s_Cg96mbGEaqQ2KzCZjscY-1fBARF26qGy1I6e5fT_U";

const supabase = createClient(supabaseUrl, supabaseKey);

const hubs = [
  'Andheri East Hub',
  'Bandra Station Hub',
  'Juhu Beach Hub',
  'BKC Hub'
];

async function update() {
  try {
    const { data: bikes, error: fetchErr } = await supabase.from('bikes').select('id, bike_code');
    if (fetchErr) {
      console.error(fetchErr);
      return;
    }

    console.log(`Found ${bikes.length} bikes. Updating...`);

    for (let i = 0; i < bikes.length; i++) {
      const bike = bikes[i];
      const hubName = hubs[i % hubs.length];
      const bikeName = `Bhar Bike EV-${bike.bike_code || bike.id}`;
      const price = 49;
      const rating = (4.2 + (i % 8) * 0.1).toFixed(1);
      const distance = `${(0.5 + (i % 5) * 0.3).toFixed(1)} km`;
      const battery = String(Math.floor(Math.random() * 50) + 45); // 45% to 94%

      const { error: updateErr } = await supabase
        .from('bikes')
        .update({
          name: bikeName,
          price: price,
          rating: parseFloat(rating),
          distance: distance,
          location: hubName, // Connect it to a real Hub Name!
          battery: battery,
          image_url: 'https://bharbike-backend.onrender.com/assets/avatar_1.png'
        })
        .eq('id', bike.id);

      if (updateErr) {
        console.error(`Error updating bike ${bike.id}:`, updateErr);
      } else {
        console.log(`Updated bike ${bike.id} (${bikeName}) -> Location: ${hubName}`);
      }
    }
    console.log("All bikes updated successfully!");
  } catch (err) {
    console.error(err);
  }
}

update();
