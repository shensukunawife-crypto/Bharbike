import { spawn } from "child_process";

async function run() {
  console.log("=== EXPO EAS CREDENTIALS RETRIEVAL ===");
  
  const child = spawn("npx", ["eas-cli", "credentials", "-p", "android"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  child.stdout.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(text);

    // If it asks for the build profile, send 'apk'
    if (text.toLowerCase().includes("which build profile") || text.toLowerCase().includes("build profile")) {
      console.log("\n[Script] Selecting 'apk' profile...");
      // Let's send the text 'apk' followed by Enter, or just Enter if apk is default.
      // Often, arrow keys are needed, but sometimes typing the name works, or just pressing Enter if the default is selected.
      // Let's send a newline first to see if it selects default, or 'apk\n'
      child.stdin.write("\n");
    }
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(data.toString());
  });

  child.on("close", (code) => {
    console.log(`\n=== PROCESS EXITED WITH CODE ${code} ===`);
  });
}

run();
