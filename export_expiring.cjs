const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function exportCSV() {
  const { data: subs } = await s.from('user_subscriptions')
    .select('user_id, status, start_date, end_date, created_at')
    .gte('end_date', '2026-08-11T00:00:00+05:30')
    .lte('end_date', '2026-08-13T23:59:59+05:30')
    .in('status', ['active', 'expired'])
    .order('end_date', { ascending: true });

  const rows = [['Sr No', 'User Name', 'Plan Status', 'Start Date', 'End Date', 'Days Remaining', 'Sub Created At']];
  const today = new Date('2026-08-12T00:00:00+05:30');

  let sr = 1;
  for (const sub of subs) {
    const { data: user } = await s.from('users').select('full_name').eq('id', sub.user_id).maybeSingle();
    const startIST = new Date(new Date(sub.start_date).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const endIST   = new Date(new Date(sub.end_date).getTime()   + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const createdIST = new Date(new Date(sub.created_at).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const daysRemaining = Math.ceil((new Date(sub.end_date) - today) / (1000 * 60 * 60 * 24));
    let daysStr;
    if (daysRemaining < 0) daysStr = 'Expired ' + Math.abs(daysRemaining) + ' day(s) ago';
    else if (daysRemaining === 0) daysStr = 'Expires today';
    else daysStr = daysRemaining + ' day(s) left';

    rows.push([sr++, user ? user.full_name : 'Unknown', sub.status.toUpperCase(), startIST, endIST, daysStr, createdIST]);
  }

  const lines = rows.map(function(r) {
    return r.map(function(c) {
      return '"' + String(c).replace(/"/g, '""') + '"';
    }).join(',');
  }).join('\n');

  const outPath = 'C:\\Users\\ronit\\Downloads\\BharBike_Expiring_Aug11_13.csv';
  fs.writeFileSync(outPath, lines, 'utf8');
  console.log('Done! Saved ' + (rows.length - 1) + ' users to: ' + outPath);
  rows.slice(1).forEach(function(r) {
    console.log(r[4] + ' | ' + r[2].padEnd(8) + ' | ' + r[1]);
  });
}

exportCSV().catch(function(e) { console.error(e); });
