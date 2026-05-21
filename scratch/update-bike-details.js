import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/admin/views/bike-details.ejs');
let content = fs.readFileSync(filePath, 'utf8');

const target = `  <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
    <div>
      <div class="stat-head">
        <span class="stat-icon">🔒</span>
        <span class="stat-label">Smart Lock</span>
      </div>
      <strong class="stat-value" style="color: <%= bike.is_locked !== false ? '#f87171' : '#4ade80' %>; font-size: 24px;">
        <%= bike.is_locked !== false ? "Locked 🔒" : "Unlocked 🔓" %>
      </strong>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button class="btn btn-sm btn-danger admin-action" data-url="/admin/bikes/<%= bike.id %>/lock" data-method="POST" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
        Lock
      </button>
      <button class="btn btn-sm btn-success admin-action" data-url="/admin/bikes/<%= bike.id %>/unlock" data-method="POST" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; background-color: #22c55e; border-color: #22c55e; color: white;">
        Unlock
      </button>
    </div>
  </div>
</div>`;

const replacement = `  <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
    <div>
      <div class="stat-head">
        <span class="stat-icon">🔒</span>
        <span class="stat-label">Smart Lock</span>
      </div>
      <strong class="stat-value" style="color: <%= bike.is_locked !== false ? '#f87171' : '#4ade80' %>; font-size: 24px;">
        <%= bike.is_locked !== false ? "Locked 🔒" : "Unlocked 🔓" %>
      </strong>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button class="btn btn-sm btn-danger admin-action" data-url="/admin/bikes/<%= bike.id %>/lock" data-method="POST" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
        Lock
      </button>
      <button class="btn btn-sm btn-success admin-action" data-url="/admin/bikes/<%= bike.id %>/unlock" data-method="POST" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; background-color: #22c55e; border-color: #22c55e; color: white;">
        Unlock
      </button>
    </div>
  </div>
  <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
    <div>
      <div class="stat-head">
        <span class="stat-icon">📡</span>
        <span class="stat-label">GPS Tracker ID</span>
      </div>
      <strong class="stat-value" style="font-size: 14.5px; word-break: break-all; margin-top: 4px; display: block; color: <%= bike.tracker_uuid ? 'var(--accent)' : '#9ca3af' %>;">
        <%= bike.tracker_uuid || "⚠️ None Linked" %>
      </strong>
    </div>
    <form class="ajax-form" data-url="/admin/bikes/<%= bike.id %>/link-gps" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
      <input type="text" name="device_uuid" placeholder="GPS Tracker UUID" value="<%= bike.tracker_uuid || '' %>" style="width: 100%; padding: 8px 10px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: inherit;" />
      <button type="submit" class="btn btn-sm btn-gold glow" style="width: 100%; padding: 8px; font-size: 12px; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; background: var(--accent); border: none; color: #fff;">
        🔗 Link / Update GPS
      </button>
    </form>
  </div>
</div>`;

// Try CRLF first, then fallback to LF
let cleanTarget = target.replace(/\r\n/g, '\n');
let cleanReplacement = replacement.replace(/\r\n/g, '\n');

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log('Replaced target with CRLF endings');
} else if (content.includes(cleanTarget)) {
  content = content.replace(cleanTarget, cleanReplacement);
  console.log('Replaced target with LF endings');
} else {
  // Let's do a loose replace by normalizing all line endings to LF
  const normContent = content.replace(/\r\n/g, '\n');
  if (normContent.includes(cleanTarget)) {
    const updatedNorm = normContent.replace(cleanTarget, cleanReplacement);
    // Write back with whatever line ending style
    content = updatedNorm;
    console.log('Replaced with normalized LF endings');
  } else {
    console.error('Target content not found in the file!');
    process.exit(1);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated bike-details.ejs');
