import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const ticketId = '1fdb1c71-5df3-487d-8830-af76e3829584'; // UUID of TNA022 ticket
  
  console.log(`Simulating updateMaintenanceStatus for ticket: ${ticketId}`);
  
  // 1. Fetch
  const { data: ticket, error: fetchErr } = await sb
    .from("maintenance")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  if (fetchErr || !ticket) {
    console.error('Ticket not found or fetch error:', fetchErr);
    return;
  }

  // 2. Prepare payload
  const body = {
    status: 'under_repair',
    technicianName: 'John Doe',
    repairCost: '250',
    expectedFixDate: '2026-07-15',
    workDetails: 'Replaced tyre and chain',
    issueType: 'Tyre & Chain',
    description: 'Sent to maintenance from Admin Panel',
    reportedDate: '2026-07-10'
  };

  const status = body.status || ticket.status;
  const technicianName = body.technicianName !== undefined ? body.technicianName : ticket.technician_name;
  const repairCost = body.repairCost !== undefined ? Number(body.repairCost) || 0 : Number(ticket.repair_cost || 0);
  const expectedFixDate = body.expectedFixDate || ticket.expected_fix_date;
  const workDetails = body.workDetails !== undefined ? body.workDetails : ticket.work_details;
  const issueType = body.issueType || ticket.issue_type;
  const description = body.description || ticket.description;
  const reportedDate = body.reportedDate ? body.reportedDate.replace("T", " ") : ticket.reported_date;
  
  let fixedDate = ticket.fixed_date;
  if (status === "completed") {
    fixedDate = body.fixedDate ? body.fixedDate.replace("T", " ") : new Date().toISOString().slice(0, 16).replace("T", " ");
  } else {
    fixedDate = null;
  }

  console.log('Sending DB update with fields:', {
    status,
    technician_name: technicianName,
    repair_cost: repairCost,
    expected_fix_date: expectedFixDate,
    issue_type: issueType,
    description,
    reported_date: reportedDate,
    work_details: workDetails,
    fixed_date: fixedDate
  });

  const { error: mErr } = await sb.from("maintenance").update({
    status,
    technician_name: technicianName,
    repair_cost: repairCost,
    expected_fix_date: expectedFixDate,
    issue_type: issueType,
    description,
    reported_date: reportedDate,
    work_details: workDetails,
    fixed_date: fixedDate
  }).eq("id", ticketId);

  if (mErr) {
    console.error('Update failed:', mErr.message);
  } else {
    console.log('Update succeeded!');
  }
}

main();
