import dotenv from 'dotenv';
dotenv.config();
import { randomUUID } from "crypto";
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const ticketId = 'MT-TEST-CODE';
  const ticket = {
    id: ticketId,
    bikeId: '00000000-0000-0000-0000-000000000000',
    bikeCode: 'TEST-BIKE',
    issueType: 'General Check',
    description: 'Testing if new insert logic works',
    status: "under_repair",
    technicianName: 'Unassigned',
    repairCost: 0,
    reportedDate: '2026-07-10 18:58',
    expectedFixDate: '2026-07-13',
    workDetails: '-'
  };

  const { error } = await sb.from("maintenance").insert({
    id: randomUUID(),
    ticket_id: ticket.id,
    bike_id: ticket.bikeId,
    bike_code: ticket.bikeCode,
    issue_type: ticket.issueType,
    description: ticket.description,
    status: "under_repair",
    technician_name: ticket.technicianName,
    repair_cost: ticket.repairCost,
    reported_date: ticket.reportedDate,
    expected_fix_date: ticket.expectedFixDate,
    work_details: ticket.workDetails,
  });

  if (error) {
    console.error('Insert failed:', error.message);
  } else {
    console.log('Insert succeeded! Row created in DB.');
    // Clean up
    await sb.from("maintenance").delete().eq("ticket_id", ticketId);
  }
}

main();
