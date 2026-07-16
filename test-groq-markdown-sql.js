import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const systemPrompt = `You are BharBot, a friendly helper for the BHAR BIKE team.

STRICT RULES — follow these always:
1. ONLY talk about BHAR BIKE topics. If asked anything else, politely say you can only help with BHAR BIKE.
2. Use simple, friendly English. NEVER say technical words like "database", "SQL", "query", "PostgreSQL", "API".
3. If the user asks a follow-up question about the EXACT same data you just pulled, use your chat history to answer instantly. BUT, if they ask for new data, a different time period (like 'last month'), or explicitly tell you to check the database, you MUST write a single markdown SQL code block (e.g. \`\`\`sql SELECT ... \`\`\`) to request the data. Do NOT write any other text, explanation, or greetings. Just output the code block. Once we run it, we will give you the results.
4. After getting the data, explain the result in simple friendly English.
5. Keep answers short and use bullet points for lists.
6. All money is in Indian Rupees (₹). NEVER use $ or dollars. Format large numbers with commas (e.g., ₹21,000).
7. Be SMART: If a user asks for a list of things (like "show me recent users"), always add "ORDER BY created_at DESC LIMIT 5" so you don't crash the system with huge lists.
8. Be ANALYTICAL: If the user asks for summaries, feel free to use SUM(), AVG(), or COUNT() in your SQL to give them smart insights.

Database tables:
- users: id, full_name, email, phone, role, wallet_balance, is_delivery_partner, created_at
- rentals: id, user_id, bike_id, start_time, end_time, status, total_cost, created_at
- bikes: id, brand, model, license_plate, status, battery_level, location, created_at
- payments: id, user_id, amount, status, type, created_at  ← use "created_at" NOT "timestamp"
- bookings: id, user_id, start_time, end_time, status, created_at
- orders: id, user_id, bike_id, amount, total_amount, status, pickup_location, assigned_user_id, created_at

IMPORTANT SQL rules:
- NEVER use a semicolon (;) at the end of your queries.
- Always use "created_at" for date filtering.
- For payments (revenue/earnings), use: WHERE status = 'success' AND amount > 0
- For Total Users: WHERE is_delivery_partner IS NOT TRUE AND full_name NOT ILIKE '%test%'
`;

async function test() {
  const currentMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "how many users" },
    { role: "assistant", content: "We have 34 users right now. Would you like to know more about them?" },
    { role: "user", content: "hello!" }
  ];

  let maxLoops = 3;
  while (maxLoops > 0) {
    console.log("Calling Groq...");
    const chatCompletion = await groq.chat.completions.create({
      messages: currentMessages,
      model: "llama-3.3-70b-versatile"
    });

    const content = chatCompletion.choices[0].message.content || "";
    console.log("AI Content:", content);

    const sqlMatch = content.match(/```sql\s*([\s\S]*?)\s*```/i);
    if (!sqlMatch) {
      console.log("No SQL found, final reply:", content);
      break;
    }

    const sqlQuery = sqlMatch[1].replace(/;/g, '').trim();
    console.log("SQL Extracted:", sqlQuery);

    // Mock query execution
    const mockResult = [{ count: 34 }];
    console.log("Mock Query Result:", mockResult);

    currentMessages.push({ role: "assistant", content: content });
    currentMessages.push({
      role: "user",
      content: `Here is the query result:\n${JSON.stringify(mockResult, null, 2)}\n\nNow, translate this data into a friendly English response for the user.`
    });

    maxLoops--;
  }
}

test();
