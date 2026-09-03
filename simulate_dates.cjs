/**
 * BharBike Subscription Date Logic Simulation
 * 10 users, 30 simulated days at 10 seconds per day
 * Auto-cleanup after simulation ends
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PLAN_ID = '03780beb-890c-43e2-995b-076ee59ca780';
const PLAN_DURATION = 7;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const SEC_PER_DAY = 10; // 1 simulated day = 10 real seconds
const SIM_DAYS = 30;

// ─── IST Helpers (same logic as istTime.js) ───────────────────────────────
function istMidnight(date) {
  const istStr = new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return new Date(istStr + 'T00:00:00+05:30');
}
function addISTDays(date, days) {
  const base = istMidnight(date);
  return istMidnight(new Date(base.getTime() + days * 24 * 60 * 60 * 1000));
}
function toISTStr(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// ─── Subscription Date Logic (mirrors subscriptionService.js) ─────────────
function calcStartDate(lastEndDate, simNow) {
  if (!lastEndDate) return istMidnight(simNow);
  const daysSince = (istMidnight(simNow) - istMidnight(lastEndDate)) / (1000 * 60 * 60 * 24);
  if (lastEndDate >= istMidnight(simNow) || daysSince <= 7) {
    return addISTDays(lastEndDate, 1);
  }
  return istMidnight(simNow);
}

function calcEndDate(startDate) {
  const lastDay = addISTDays(startDate, PLAN_DURATION - 1);
  return new Date(lastDay.getTime() + 23 * 60 * 60 * 1000); // 11 PM IST
}

// ─── Simulation Users ──────────────────────────────────────────────────────
const SIM_USERS = [
  { tag: 'sim_u01', name: 'SIM Early Payer',   phone: '+919999000001', email: 'sim_u01@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry - 3) },
  { tag: 'sim_u02', name: 'SIM On Time Payer', phone: '+919999000002', email: 'sim_u02@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === lastExpiry },
  { tag: 'sim_u03', name: 'SIM Grace Day 1',   phone: '+919999000003', email: 'sim_u03@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry + 1) },
  { tag: 'sim_u04', name: 'SIM Grace Day 3',   phone: '+919999000004', email: 'sim_u04@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry + 3) },
  { tag: 'sim_u05', name: 'SIM Grace Day 7',   phone: '+919999000005', email: 'sim_u05@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry + 7) },
  { tag: 'sim_u06', name: 'SIM Late Payer',    phone: '+919999000006', email: 'sim_u06@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry + 8) },
  { tag: 'sim_u07', name: 'SIM Very Late',      phone: '+919999000007', email: 'sim_u07@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry + 15) },
  { tag: 'sim_u08', name: 'SIM Skip Days',      phone: '+919999000008', email: 'sim_u08@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry + 1),
    skipDayOn: [5, 19] }, // Add 2 skip days on sim day 5 and 19
  { tag: 'sim_u09', name: 'SIM Ghost Record',   phone: '+919999000009', email: 'sim_u09@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry + 1),
    ghostOn: 7 }, // Admin creates ghost record on day 7
  { tag: 'sim_u10', name: 'SIM Multi Renewal',  phone: '+919999000010', email: 'sim_u10@bharbike.test',
    payOn: (day, lastExpiry) => lastExpiry !== null && day === (lastExpiry - 5) }, // Renews 5 days before expiry every time
];

// ─── State tracking per user ───────────────────────────────────────────────
const userState = {}; // { userId, lastEndDate (day number), lastEndDateObj, planCount, subId, hasGhost }

// ─── Log tracking ─────────────────────────────────────────────────────────
const csvRows = [['Sim Day','Date','User','Event','Old End Date','New Start','New End','Days Since Expiry','Backtrack?','Anomaly']];
const anomalies = [];

function log(day, simDate, user, event, oldEnd, newStart, newEnd, daysSince, backtrack, anomaly) {
  const row = [day, toISTStr(simDate), user, event, oldEnd || '-', newStart || '-', newEnd || '-', daysSince !== null ? daysSince.toFixed(1) : '-', backtrack, anomaly || ''];
  csvRows.push(row);
  const flag = anomaly ? ' ⚠️  ' : '     ';
  console.log(`[Day ${String(day).padStart(2,'0')}] ${flag} ${toISTStr(simDate)} | ${user.padEnd(22)} | ${event.padEnd(25)} | ${oldEnd || '-'} -> ${newStart || '-'} to ${newEnd || '-'} ${anomaly ? '| ⚠️  ' + anomaly : ''}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── DB Operations ─────────────────────────────────────────────────────────
async function createSimUser(u) {
  const { data, error } = await s.from('users').insert({
    full_name: u.name, phone: u.phone, email: u.email,
    is_blocked: false, is_delivery_partner: false, is_online: false,
    status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw new Error('Failed to create user ' + u.name + ': ' + error.message);
  return data.id;
}

async function createSubscription(userId, startDate, endDate, simNow) {
  // Expire old active sub
  await s.from('user_subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('user_id', userId).eq('status', 'active');

  const status = endDate > istMidnight(simNow) ? 'active' : 'expired';
  const { data, error } = await s.from('user_subscriptions').insert({
    user_id: userId, plan_id: PLAN_ID, status,
    start_date: startDate.toISOString(), end_date: endDate.toISOString(),
    auto_renew: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw new Error('Failed to create subscription: ' + error.message);
  return data.id;
}

async function createPayment(userId) {
  await s.from('payments').insert({
    user_id: userId, amount: 1950, status: 'success',
    razorpay_payment_id: 'SIM_' + Date.now(), order_id: 'SIM_ORDER_' + Date.now(),
    created_at: new Date().toISOString()
  });
}

async function addSkipDays(userId, userName, currentEndDate) {
  const skipDays = 2;
  const newEnd = new Date(currentEndDate.getTime() + skipDays * 24 * 60 * 60 * 1000);
  await s.from('user_subscriptions').update({ end_date: newEnd.toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId).eq('status', 'active');
  await s.from('rider_skipped_days').insert({
    rider_name: userName, bike_id: 'SIM_BIKE', days_skipped: skipDays,
    skipped_start_date: toISTStr(currentEndDate), skipped_end_date: toISTStr(newEnd),
    reason: 'SIMULATION SKIP', status: 'Active', created_at: new Date().toISOString()
  });
  return newEnd;
}

async function createGhostRecord(userId, simDate) {
  // Admin manually creates ghost subscription (no payment)
  const ghostStart = addISTDays(simDate, 1);
  const ghostEnd = addISTDays(simDate, 7);
  await s.from('user_subscriptions').insert({
    user_id: userId, plan_id: PLAN_ID, status: 'expired',
    start_date: ghostStart.toISOString(), end_date: ghostEnd.toISOString(),
    auto_renew: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  });
  return { ghostStart, ghostEnd };
}

async function getLatestEndDate(userId) {
  const { data } = await s.from('user_subscriptions').select('end_date, status')
    .eq('user_id', userId).in('status', ['active', 'expired'])
    .order('end_date', { ascending: false }).limit(1).maybeSingle();
  return data ? new Date(data.end_date) : null;
}

async function cleanupSimData(userIds, userNames) {
  console.log('\n🧹 CLEANING UP SIMULATION DATA...');
  for (const uid of userIds) {
    await s.from('payments').delete().eq('user_id', uid);
    await s.from('user_subscriptions').delete().eq('user_id', uid);
    await s.from('users').delete().eq('id', uid);
  }
  for (const name of userNames) {
    await s.from('rider_skipped_days').delete().ilike('rider_name', name);
  }
  console.log('✅ Cleanup complete. All simulation data removed from database.\n');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
async function runSimulation() {
  const SIM_BASE_DATE = istMidnight(new Date()); // today IST as day 0

  console.log('='.repeat(100));
  console.log('🚀 BHARBIKE SUBSCRIPTION DATE LOGIC SIMULATION');
  console.log('   30 simulated days | 1 day = ' + SEC_PER_DAY + ' real seconds | ' + SIM_DAYS + ' days total = ~' + Math.ceil(SIM_DAYS * SEC_PER_DAY / 60) + ' minutes');
  console.log('   Base date: ' + toISTStr(SIM_BASE_DATE));
  console.log('='.repeat(100));

  // 1. Create all sim users
  console.log('\n📋 CREATING 10 SIMULATION USERS...');
  const userIds = [];
  const userNames = [];
  for (const u of SIM_USERS) {
    const id = await createSimUser(u);
    userState[u.tag] = { userId: id, lastEndDate: null, lastEndDateObj: null, planCount: 0, hasGhost: false };
    userIds.push(id);
    userNames.push(u.name);
    console.log('  ✅ Created: ' + u.name + ' (' + id + ')');
  }

  // 2. Create initial subscriptions for all users on Day 0
  console.log('\n📅 CREATING INITIAL SUBSCRIPTIONS (Day 0)...');
  for (const u of SIM_USERS) {
    const uid = userState[u.tag].userId;
    const startDate = istMidnight(SIM_BASE_DATE);
    const endDate = calcEndDate(startDate);
    await createPayment(uid);
    await createSubscription(uid, startDate, endDate, SIM_BASE_DATE);
    const endDay = Math.round((istMidnight(endDate) - SIM_BASE_DATE) / (24 * 60 * 60 * 1000));
    userState[u.tag].lastEndDate = endDay;
    userState[u.tag].lastEndDateObj = endDate;
    userState[u.tag].planCount = 1;
    log(0, SIM_BASE_DATE, u.name, 'INITIAL PLAN CREATED', null, toISTStr(startDate), toISTStr(endDate), null, 'N/A (first plan)', null);
  }

  // 3. Run day by day
  console.log('\n▶️  STARTING SIMULATION...\n');
  console.log(('Day  ').padEnd(7) + 'Date'.padEnd(15) + 'User'.padEnd(24) + 'Event'.padEnd(27) + 'Date Range'.padEnd(30) + 'Anomaly');
  console.log('-'.repeat(100));

  for (let day = 1; day <= SIM_DAYS; day++) {
    await sleep(SEC_PER_DAY * 1000);
    const simNow = addISTDays(SIM_BASE_DATE, day);

    for (const u of SIM_USERS) {
      const st = userState[u.tag];
      const uid = st.userId;

      // Check for skip days (User 8)
      if (u.skipDayOn && u.skipDayOn.includes(day) && st.lastEndDateObj) {
        const { data: activeSub } = await s.from('user_subscriptions').select('id, end_date').eq('user_id', uid).eq('status', 'active').maybeSingle();
        if (activeSub) {
          const newEnd = await addSkipDays(uid, u.name, new Date(activeSub.end_date));
          const newEndDay = Math.round((istMidnight(newEnd) - SIM_BASE_DATE) / (24 * 60 * 60 * 1000));
          log(day, simNow, u.name, 'SKIP DAYS ADDED (+2)', toISTStr(st.lastEndDateObj), '-', toISTStr(newEnd), null, 'Extended', null);
          st.lastEndDate = newEndDay;
          st.lastEndDateObj = newEnd;
        }
      }

      // Check for ghost record (User 9)
      if (u.ghostOn && day === u.ghostOn && !st.hasGhost) {
        const { ghostStart, ghostEnd } = await createGhostRecord(uid, simNow);
        st.hasGhost = true;
        const ghostEndDay = Math.round((istMidnight(ghostEnd) - SIM_BASE_DATE) / (24 * 60 * 60 * 1000));
        log(day, simNow, u.name, 'GHOST RECORD CREATED', toISTStr(st.lastEndDateObj), toISTStr(ghostStart), toISTStr(ghostEnd), null, 'Admin Override', '⚠️ Ghost created, no payment');
        // Ghost now has higher end_date than real plan — update tracking
        if (ghostEnd > st.lastEndDateObj) {
          st.lastEndDate = ghostEndDay;
          st.lastEndDateObj = ghostEnd;
        }
        anomalies.push({ day, user: u.name, detail: 'Ghost record created by admin — future backtrack will use ghost end date: ' + toISTStr(ghostEnd) });
      }

      // Check if user should pay today
      if (st.lastEndDate !== null && u.payOn(day, st.lastEndDate)) {
        // Fetch latest end date from DB (in case skip days or ghost modified it)
        const latestEndObj = await getLatestEndDate(uid);
        
        const daysSince = (istMidnight(simNow) - istMidnight(latestEndObj)) / (1000 * 60 * 60 * 24);
        const newStart = calcStartDate(latestEndObj, simNow);
        const newEnd = calcEndDate(newStart);
        const newEndDay = Math.round((istMidnight(newEnd) - SIM_BASE_DATE) / (24 * 60 * 60 * 1000));
        
        const isBacktrack = newStart < istMidnight(simNow);
        const expectedStart = daysSince <= 7 ? addISTDays(latestEndObj, 1) : istMidnight(simNow);

        // Anomaly detection
        let anomaly = null;
        const diff = Math.round((istMidnight(newStart) - istMidnight(expectedStart)) / (24 * 60 * 60 * 1000));
        if (diff !== 0) {
          anomaly = 'Start date off by ' + diff + ' days from expected!';
          anomalies.push({ day, user: u.name, detail: anomaly + ' Expected: ' + toISTStr(expectedStart) + ' Got: ' + toISTStr(newStart) });
        }

        // Consecutive check: no gap or overlap with previous plan
        if (daysSince >= 0 && daysSince <= 7) {
          const prevEndDay = st.lastEndDate;
          const newStartDay = Math.round((istMidnight(newStart) - SIM_BASE_DATE) / (24 * 60 * 60 * 1000));
          const gap = newStartDay - prevEndDay - 1;
          if (gap > 0) {
            anomaly = 'GAP of ' + gap + ' days between plans!';
            anomalies.push({ day, user: u.name, detail: anomaly });
          } else if (gap < 0) {
            anomaly = 'OVERLAP of ' + Math.abs(gap) + ' days!';
            anomalies.push({ day, user: u.name, detail: anomaly });
          }
        }

        await createPayment(uid);
        await createSubscription(uid, newStart, newEnd, simNow);
        st.lastEndDate = newEndDay;
        st.lastEndDateObj = newEnd;
        st.planCount++;

        log(day, simNow, u.name, 'PAYMENT + NEW PLAN (#' + st.planCount + ')', toISTStr(latestEndObj), toISTStr(newStart), toISTStr(newEnd), daysSince, isBacktrack ? 'YES (backtrack)' : 'NO (fresh start)', anomaly);
      }
    }
  }

  // 4. Final summary
  console.log('\n' + '='.repeat(100));
  console.log('📊 SIMULATION COMPLETE — FINAL STATUS');
  console.log('='.repeat(100));
  for (const u of SIM_USERS) {
    const st = userState[u.tag];
    console.log(u.name.padEnd(25) + '| Plans created: ' + st.planCount + ' | Last end date: ' + toISTStr(st.lastEndDateObj));
  }

  if (anomalies.length === 0) {
    console.log('\n✅ NO ANOMALIES DETECTED — All date logic is correct!');
  } else {
    console.log('\n⚠️  ' + anomalies.length + ' ANOMALIES DETECTED:');
    anomalies.forEach((a, i) => console.log('  ' + (i+1) + '. Day ' + a.day + ' | ' + a.user + ': ' + a.detail));
  }

  // 5. Export CSV
  const csvPath = 'C:\\Users\\ronit\\Downloads\\BharBike_Simulation_Results.csv';
  const csvContent = csvRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log('\n📁 CSV saved to: ' + csvPath);

  // 6. Cleanup
  await cleanupSimData(userIds, userNames);
}

runSimulation().catch(err => {
  console.error('SIMULATION FAILED:', err.message);
  process.exit(1);
});
