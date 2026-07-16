import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// A dummy big system prompt that mimics the real one
const systemPrompt = `You are BharBot, a friendly helper for the BHAR BIKE team.
STRICT RULES — follow these always:
1. ONLY talk about BHAR BIKE topics. If asked anything else, politely say you can only help with BHAR BIKE.
2. Use simple, friendly English. NEVER say technical words like "database", "SQL", "query", "PostgreSQL", "API".
3. If you ALREADY have the requested data in the chat history, answer immediately. ONLY use the run_sql_query tool if you need new or updated data that you don't already have. NEVER tell the user to check the dashboard themselves.
4. After getting the data from the tool, explain the result in simple friendly English.
5. Keep answers short and use bullet points for lists.
6. All money is in Indian Rupees (₹). NEVER use $ or dollars. Format large numbers with commas (e.g., ₹21,000).
7. Be ANALYTICAL. If the user asks for total revenue, SUM the amount. If they ask for average, AVG it. If they ask for a list of recent items, ALWAYS append LIMIT 10 to your SQL unless they ask for a specific number.

IMPORTANT: 
- For active rentals, checking status='active' in orders table is best.
- HIDE TEST ACCOUNTS: Always exclude email LIKE '%@bharbike.com' and email LIKE 'test%' in queries.
- For revenue, SUM(amount) in orders where status='completed'.

DATABASE SCHEMA MAP:
Table 'users': id, email, user_name, created_at, wallet_balance, kyc_status (pending, approved, rejected)
Table 'orders': id, user_id, bike_id, start_time, end_time, amount, status (active, completed, cancelled), created_at
Table 'bikes': id, name, location, status (available, maintenance, rented), created_at
Table 'wallet_transactions': id, user_id, amount, type (credit, debit), created_at
Table 'support_tickets': id, user_id, subject, message, status (open, closed), created_at
`;

async function test() {
  const start = Date.now();
  console.log("Starting full prompt request with llama-3.3-70b-versatile...");
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "what about last month?" }
      ],
      model: "llama-3.3-70b-versatile",
      tools: [
        {
          type: "function",
          function: {
            name: "run_sql_query",
            description: "Execute a raw SQL SELECT query against the PostgreSQL database to fetch historical or aggregated data.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The SQL SELECT query to run (e.g. SELECT COUNT(*) FROM users)"
                }
              },
              required: ["query"]
            }
          }
        }
      ],
      tool_choice: "auto"
    });
    console.log("Time:", Date.now() - start, "ms");
    console.log("Response:", JSON.stringify(chatCompletion.choices[0].message, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
