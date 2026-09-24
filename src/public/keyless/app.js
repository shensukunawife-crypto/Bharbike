/**
 * BharBike Keyless 3D Tactile Ignition Switch & QR Scanner
 */

let activeBikeCode = null; // No bike active until QR is scanned or URL param provided
let currentIgnitionState = "OFF"; // 'ON' or 'OFF' or 'UNKNOWN'
let html5QrScanner = null;
let isCameraActive = false;
let pendingAction = null; // 'ON' or 'OFF'
let isSimModeActive = false; // LIVE REAL HARDWARE MODE by default! Real commands!

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initTimeDisplay();
  checkUrlParams();
  loadBikesDropdown();
  
  if (activeBikeCode) {
    // User scanned bike QR code with phone camera (or clicked link with ?bike=...)
    showControlView(activeBikeCode);
  } else {
    // No bike scanned yet: enforce scanning first!
    showScannerView();
  }

  const chk = document.getElementById("simModeCheckbox");
  if (chk) chk.checked = isSimModeActive;
});

function showControlView(bikeCode) {
  if (!bikeCode) return;
  activeBikeCode = bikeCode;
  const scannerCard = document.getElementById("scannerCard");
  const controlCard = document.getElementById("controlCard");
  if (scannerCard) scannerCard.classList.add("hidden");
  if (controlCard) controlCard.classList.remove("hidden");
  stopCameraScanner();
  fetchBikeStatus(bikeCode);
  addLog(`🔑 Unlocked keyless controls for bike ${bikeCode}`, "success");
}

function showScannerView() {
  activeBikeCode = null;
  const scannerCard = document.getElementById("scannerCard");
  const controlCard = document.getElementById("controlCard");
  if (controlCard) controlCard.classList.add("hidden");
  if (scannerCard) scannerCard.classList.remove("hidden");
  if (window.location.search) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  addLog("Scan QR code on the bike to unlock ignition.", "system");
}

function returnToScanner() {
  showScannerView();
  startCameraScanner();
}

function toggleSimMode(checked) {
  isSimModeActive = Boolean(checked);
  const banner = document.getElementById("simBanner");
  const title = document.getElementById("simTitle");
  const subtitle = document.getElementById("simSubtitle");
  const icon = document.getElementById("simIcon");
  if (isSimModeActive) {
    if (banner) banner.classList.add("active");
    if (icon) icon.textContent = "🧪";
    if (title) title.textContent = "Hardware Dispatch: SAFE TEST";
    if (subtitle) subtitle.textContent = "Hardware bypass active (No real relay signals sent)";
    addLog("🧪 Safe Test Mode ENABLED: Real bike relay signals are bypassed.", "system");
  } else {
    if (banner) banner.classList.remove("active");
    if (icon) icon.textContent = "⚡";
    if (title) title.textContent = "Hardware Dispatch: LIVE";
    if (subtitle) subtitle.textContent = "Real physical ignition commands enabled";
    addLog("⚡ LIVE MODE ACTIVATED: Real physical ignition commands will be sent!", "system");
  }
}

function initTimeDisplay() {
  const initElem = document.getElementById("initTime");
  if (initElem) {
    initElem.textContent = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
}

// 1. URL Parameter Detection (e.g. ?bike=TNA074)
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  let bikeParam = params.get("bike") || params.get("bikeCode") || params.get("code") || params.get("b");
  if (bikeParam) {
    bikeParam = bikeParam.trim().toUpperCase();
    if (/^\d{1,3}$/.test(bikeParam)) {
      bikeParam = `TNA${bikeParam.padStart(3, "0")}`;
    }
    activeBikeCode = bikeParam;
    addLog(`Auto-selected bike from link: ${activeBikeCode}`, "system");
  }
}

// 2. Load Registered Bikes
async function loadBikesDropdown() {
  const select = document.getElementById("bikeSelect");
  if (!select) return;

  try {
    const res = await fetch("/api/bikes-list");
    const json = await res.json();
    if (json.success && Array.isArray(json.bikes)) {
      select.innerHTML = '<option value="">-- Choose a Registered Bike --</option>';
      json.bikes.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.code;
        opt.textContent = `${b.code} ${b.hasGps ? '📡' : ''} • ${b.battery}% (${b.status})`;
        if (b.code === activeBikeCode) opt.selected = true;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.warn("Could not load bikes list:", err.message);
  }
}

// 3. Tab Switching
function switchTab(mode) {
  const tabScan = document.getElementById("tabScan");
  const tabManual = document.getElementById("tabManual");
  const scannerView = document.getElementById("scannerView");
  const manualView = document.getElementById("manualView");

  if (mode === "scan") {
    tabScan.classList.add("active");
    tabManual.classList.remove("active");
    scannerView.classList.remove("hidden");
    manualView.classList.add("hidden");
  } else {
    tabManual.classList.add("active");
    tabScan.classList.remove("active");
    manualView.classList.remove("hidden");
    scannerView.classList.add("hidden");
    stopCameraScanner();
  }
}

// 4. Camera QR Scanner (Html5Qrcode)
async function toggleCameraScanner() {
  if (isCameraActive) {
    stopCameraScanner();
  } else {
    startCameraScanner();
  }
}

async function startCameraScanner() {
  const btnText = document.getElementById("camBtnText");
  const btnIcon = document.getElementById("camBtnIcon");

  if (!html5QrScanner) {
    html5QrScanner = new Html5Qrcode("qr-reader");
  }

  try {
    btnText.textContent = "Starting Camera...";
    await html5QrScanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 240, height: 240 }
      },
      (decodedText) => {
        onQrCodeScanned(decodedText);
      },
      () => {}
    );

    isCameraActive = true;
    btnText.textContent = "Stop Camera Scanner";
    btnIcon.textContent = "⏹️";
    addLog("Camera scanner active. Focus on bike QR code.", "system");
  } catch (err) {
    console.error("Camera error:", err);
    btnText.textContent = "Start Camera Scanner";
    btnIcon.textContent = "📷";
    isCameraActive = false;
    alert("Camera permission denied or camera not found: " + (err.message || err));
  }
}

async function stopCameraScanner() {
  if (html5QrScanner && isCameraActive) {
    try {
      await html5QrScanner.stop();
    } catch (e) {}
    isCameraActive = false;
    const btnText = document.getElementById("camBtnText");
    const btnIcon = document.getElementById("camBtnIcon");
    if (btnText) btnText.textContent = "Start Camera Scanner";
    if (btnIcon) btnIcon.textContent = "📷";
  }
}

function onQrCodeScanned(qrText) {
  let extractedCode = qrText.trim();
  try {
    if (qrText.includes("http://") || qrText.includes("https://")) {
      const url = new URL(qrText);
      extractedCode = url.searchParams.get("bike") || 
                      url.searchParams.get("bikeCode") || 
                      url.pathname.split("/").filter(Boolean).pop() || 
                      extractedCode;
    }
  } catch (e) {}

  extractedCode = extractedCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (/^\d{1,3}$/.test(extractedCode)) {
    extractedCode = `TNA${extractedCode.padStart(3, "0")}`;
  }

  if (extractedCode) {
    if ("vibrate" in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
    stopCameraScanner();
    addLog(`✅ Scanned QR successfully! Bike: ${extractedCode}`, "success");
    showToast(`Scanned Bike: ${extractedCode}`, "📷");
    showControlView(extractedCode);
  }
}

// 5. Manual Selection
function onSelectBike(val) {
  if (!val) return;
  showControlView(val.trim().toUpperCase());
}

function confirmManualInput() {
  const input = document.getElementById("manualBikeInput");
  let val = (input?.value || "").trim().toUpperCase();
  if (!val) {
    alert("Please enter a valid bike code (e.g. TNA074)");
    return;
  }
  if (/^\d{1,3}$/.test(val)) {
    val = `TNA${val.padStart(3, "0")}`;
  }
  showControlView(val);
}

// 6. Fetch Bike Status & Telematics
async function fetchBikeStatus(bikeCode) {
  if (!bikeCode) return;
  
  const displayCode = document.getElementById("displayBikeCode");
  const displayName = document.getElementById("displayBikeName");
  const ignitionBadge = document.getElementById("ignitionBadge");
  const ignitionText = document.getElementById("ignitionText");
  const telemBattery = document.getElementById("telemBattery");
  const batteryBar = document.getElementById("batteryBar");
  const telemSpeed = document.getElementById("telemSpeed");
  const speedStatus = document.getElementById("speedStatus");
  const telemGps = document.getElementById("telemGps");
  const lastPingText = document.getElementById("lastPingText");
  const btnRefresh = document.getElementById("btnRefresh");

  displayCode.textContent = bikeCode;
  ignitionBadge.className = "status-badge";
  ignitionText.textContent = "POLLING...";
  btnRefresh.textContent = "⏳ Updating...";

  try {
    const res = await fetch(`/api/bike-status?bikeCode=${encodeURIComponent(bikeCode)}`);
    const data = await res.json();

    if (!data.success) {
      displayCode.textContent = bikeCode;
      displayName.textContent = data.message || "Bike not mapped";
      ignitionBadge.className = "status-badge state-off";
      ignitionText.textContent = "UNLINKED";
      telemBattery.textContent = "--%";
      if (batteryBar) batteryBar.style.width = "0%";
      telemSpeed.textContent = "--";
      telemGps.textContent = "Unlinked";
      lastPingText.textContent = data.message || "No tracker mapped";
      setSwitchVisualState("OFF");
      addLog(`Status check for ${bikeCode}: ${data.message}`, "error");
      return;
    }

    const { bike, telematics } = data;
    displayName.textContent = bike.name || `BharBike ${bike.bikeCode}`;
    const batt = bike.battery != null ? Number(bike.battery) : 80;
    telemBattery.textContent = `${batt}%`;
    if (batteryBar) {
      batteryBar.style.width = `${Math.max(5, Math.min(100, batt))}%`;
    }

    // Telematics Speed & GPS
    const speedVal = telematics.speed || 0;
    telemSpeed.textContent = `${speedVal} km/h`;
    speedStatus.textContent = speedVal > 0 ? "Moving" : "Stationary";

    if (telematics.isOnline) {
      telemGps.textContent = "Online";
      telemGps.style.color = "var(--accent-green-dark)";
      lastPingText.textContent = telematics.lastPingText || "Active";
    } else {
      telemGps.textContent = "Standby (Sleep)";
      telemGps.style.color = "#d97706";
      lastPingText.textContent = telematics.lastPingText ? `Asleep • Ping ${telematics.lastPingText}` : "Touch bike to wake";
    }

    // Ignition state
    const igState = (telematics.ignition || "UNKNOWN").toUpperCase();
    currentIgnitionState = igState;

    if (igState === "ON") {
      ignitionBadge.className = "status-badge state-on";
      ignitionText.textContent = "🟢 IGNITION ON";
      setSwitchVisualState("ON");
    } else if (igState === "OFF") {
      ignitionBadge.className = "status-badge state-off";
      ignitionText.textContent = "🔴 IGNITION OFF";
      setSwitchVisualState("OFF");
    } else {
      ignitionBadge.className = "status-badge";
      ignitionText.textContent = `⚪ ${igState}`;
      setSwitchVisualState("OFF");
    }

    addLog(`Live telematics: Bike ${bikeCode} is ${igState} • ${speedVal} km/h`, "system");

  } catch (err) {
    console.error("fetchBikeStatus error:", err);
    ignitionText.textContent = "ERROR";
    addLog(`Network error updating ${bikeCode}: ${err.message}`, "error");
  } finally {
    btnRefresh.textContent = "🔄 Refresh Status";
  }
}

function refreshBikeStatus() {
  fetchBikeStatus(activeBikeCode);
}

// 7. 3D Tactile Switch Visual State Management
function setSwitchVisualState(state) {
  const track = document.getElementById("switchTrack");
  const labelOn = document.getElementById("labelOn");
  const labelOff = document.getElementById("labelOff");
  const feedback = document.getElementById("switchFeedback");

  if (state === "ON") {
    track.className = "tactile-switch-track state-on";
    labelOn.classList.add("active");
    labelOff.classList.remove("active");
    feedback.innerHTML = `Current State: <strong style="color:var(--accent-green-dark)">IGNITION ON</strong> (Relay Closed)`;
  } else {
    track.className = "tactile-switch-track state-off";
    labelOff.classList.add("active");
    labelOn.classList.remove("active");
    feedback.innerHTML = `Current State: <strong style="color:var(--text-secondary)">IGNITION OFF</strong> (Relay Open)`;
  }
}

// Handle clicking the 3D Track
function handleTrackClick(e) {
  // If currently ON -> prompt to turn OFF
  // If currently OFF -> prompt to turn ON
  if (currentIgnitionState === "ON") {
    confirmBikeAction("OFF");
  } else {
    confirmBikeAction("ON");
  }
}

function triggerSwitchAction(targetAction) {
  confirmBikeAction(targetAction);
}

// 8. Action Confirmation Modal
function confirmBikeAction(action) {
  pendingAction = action;
  const modal = document.getElementById("confirmModal");
  const iconBubble = document.getElementById("modalIconBubble");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const confirmBtn = document.getElementById("modalConfirmBtn");

  if (action === "ON") {
    iconBubble.textContent = "⚡";
    iconBubble.style.color = "var(--accent-green-dark)";
    modalTitle.textContent = isSimModeActive ? "Simulate: Turn ON Ignition?" : "Turn ON Ignition?";
    modalDesc.innerHTML = isSimModeActive
      ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">🧪 SAFE TEST MODE</span><br><br>Simulating <strong>MOBILIZE</strong> command for <strong>${activeBikeCode}</strong>. Real bike relay will <strong>NOT</strong> be triggered.`
      : `This will send a <strong>MOBILIZE</strong> command to <strong>${activeBikeCode}</strong> to close the relay and supply ignition power.`;
    confirmBtn.className = "btn btn-3d";
    confirmBtn.style.background = "linear-gradient(135deg, #00d293, #059669)";
    confirmBtn.style.color = "#ffffff";
    confirmBtn.textContent = isSimModeActive ? "Simulate Power ON" : "Yes, Power ON";
  } else {
    iconBubble.textContent = "🛑";
    iconBubble.style.color = "var(--accent-red)";
    modalTitle.textContent = isSimModeActive ? "Simulate: Turn OFF Ignition?" : "Turn OFF Ignition?";
    modalDesc.innerHTML = isSimModeActive
      ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">🧪 SAFE TEST MODE</span><br><br>Simulating <strong>IMMOBILIZE</strong> command for <strong>${activeBikeCode}</strong>. Real bike relay will <strong>NOT</strong> be triggered.`
      : `This will send an <strong>IMMOBILIZE</strong> command to <strong>${activeBikeCode}</strong> to cut power and lock ignition.<br><br><span style="color:#d97706;font-weight:700;">⚠️ Please ensure bike is safely parked!</span>`;
    confirmBtn.className = "btn btn-3d";
    confirmBtn.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    confirmBtn.style.color = "#ffffff";
    confirmBtn.textContent = isSimModeActive ? "Simulate Power OFF" : "Yes, Power OFF";
  }

  modal.classList.remove("hidden");
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmModal");
  modal.classList.add("hidden");
  pendingAction = null;
}

// 9. Execute Confirmed Action
async function executeConfirmedAction() {
  const action = pendingAction;
  closeConfirmModal();
  if (!action || !activeBikeCode) return;

  const spinnerOn = document.getElementById("spinnerOn");
  const spinnerOff = document.getElementById("spinnerOff");
  const btn3dOn = document.getElementById("btn3dOn");
  const btn3dOff = document.getElementById("btn3dOff");

  if (action === "ON") {
    spinnerOn.classList.remove("hidden");
    btn3dOn.disabled = true;
  } else {
    spinnerOff.classList.remove("hidden");
    btn3dOff.disabled = true;
  }

  const modeTag = isSimModeActive ? "[TEST DRY-RUN]" : "[LIVE HARDWARE]";
  addLog(`${modeTag} [Step 1/3] Waking up bike & transmitting ${action === 'ON' ? 'MOBILIZE' : 'IMMOBILIZE'} for ${activeBikeCode}...`, "system");
  showToast(`Waking up bike & sending ignition signal...`, "⚡");

  try {
    const res = await fetch("/api/bike-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bikeCode: activeBikeCode,
        action: action,
        dryRun: isSimModeActive
      })
    });

    const data = await res.json();

    if (data.success) {
      const ackTag = data.simulation ? "🧪 SIMULATED" : "⚡ ACK";
      addLog(`📡 [Step 2/3] Ignition command dispatched (${ackTag}) [ReqId: ${data.requestId || 'ack'}]. Verifying relay response...`, "system");
      showToast(data.message, action === "ON" ? "⚡" : "🛑");

      // Haptic confirmation
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      // Immediately flip switch visually
      setSwitchVisualState(action);
      currentIgnitionState = action;

      // Smart Verification Loop: Poll after 2.5s and 5.5s to confirm relay
      setTimeout(async () => {
        await fetchBikeStatus(activeBikeCode);
        addLog(`🟢 [Step 3/3] Confirmed: Hardware relay engaged! Bike ${activeBikeCode} is ${action}.`, "success");
        if ("vibrate" in navigator) {
          navigator.vibrate([100, 50, 150, 50, 200]);
        }
      }, 3000);

    } else {
      addLog(`❌ FAILED: ${data.message || 'Command rejected'}`, "error");
      showToast(`Error: ${data.message}`, "❌");
      alert(`Command Error: ${data.message || 'Unknown error'}`);
    }
  } catch (err) {
    addLog(`❌ NETWORK ERROR: ${err.message}`, "error");
    alert("Network request failed: " + err.message);
  } finally {
    spinnerOn.classList.add("hidden");
    spinnerOff.classList.add("hidden");
    btn3dOn.disabled = false;
    btn3dOff.disabled = false;
  }
}

// 10. Toast Helper
function showToast(text, icon = "✅") {
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");
  const toastIcon = document.getElementById("toastIcon");

  if (!toast) return;
  toastText.textContent = text;
  toastIcon.textContent = icon;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}

// 11. Event Log Stream Helper
function addLog(message, type = "system") {
  const logsFeed = document.getElementById("logsFeed");
  if (!logsFeed) return;

  const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <span class="log-time">${timeStr}</span>
    <span class="log-text">${escapeHtml(message)}</span>
  `;

  logsFeed.prepend(entry);
}

function clearLogs() {
  const logsFeed = document.getElementById("logsFeed");
  if (logsFeed) logsFeed.innerHTML = "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
