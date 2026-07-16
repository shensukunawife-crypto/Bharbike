import { spawn } from "child_process";

async function login() {
  console.log("=== EXPO EAS AUTOMATED LOGIN ===");
  
  const child = spawn("npx", ["eas-cli", "login", "--no-browser"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  child.stdout.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(text);

    if (text.toLowerCase().includes("email or username") || text.toLowerCase().includes("username")) {
      console.log("\n[Script] Sending username...");
      child.stdin.write("eres07\n");
    }

    if (text.toLowerCase().includes("password")) {
      console.log("\n[Script] Sending password...");
      child.stdin.write("eres@9325296264\n");
    }
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(data.toString());
  });

  child.on("close", (code) => {
    console.log(`\n=== PROCESS EXITED WITH CODE ${code} ===`);
  });
}

login();
