import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as walletService from "../src/services/walletService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const USER_ID = "55a92d34-a26f-4768-9d30-017c4b8d4407";

async function testAdd() {
  try {
    const res = await walletService.addMoney(USER_ID, 500, "Admin Manual Credit Test");
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

testAdd();
