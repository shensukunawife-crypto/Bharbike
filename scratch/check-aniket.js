import supabase from "../src/utils/supabaseClient.js";

async function checkAniket() {
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", "637060b1-2e7d-4c5f-a534-bada594be535")
      .maybeSingle();
      
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", "637060b1-2e7d-4c5f-a534-bada594be535")
      .maybeSingle();

    console.log("Profile matching UUID:", prof);
    console.log("User matching UUID:", user);

    const { data: profName } = await supabase
      .from("profiles")
      .select("*")
      .ilike("full_name", "%aniket%")
      .limit(5);

    const { data: userName } = await supabase
      .from("users")
      .select("*")
      .ilike("full_name", "%aniket%")
      .limit(5);

    console.log("Profiles matching Name Aniket:", profName);
    console.log("Users matching Name Aniket:", userName);

  } catch (err) {
    console.error("Error:", err);
  }
}

checkAniket();
