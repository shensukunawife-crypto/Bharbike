/**
 * Sidebar group collapse + mobile drawer logic.
 */
(function () {
  const STORAGE_KEY = "adminSidebarGroupsV2";

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveState(map) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
  }

  function setGroupOpen(groupEl, open) {
    groupEl.classList.toggle("is-open", open);
    const btn = groupEl.querySelector(".nav-group-btn");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function initGroups() {
    const groups = document.querySelectorAll(".nav-group[data-group-id]");
    if (!groups.length) return;

    const stored = loadState();

    groups.forEach((group) => {
      const id = group.dataset.groupId;
      const hasActive = Boolean(group.querySelector(".nav-link.active"));
      let open = stored[id];
      if (typeof open !== "boolean") open = hasActive;
      if (hasActive) open = true;
      setGroupOpen(group, open);
    });

    groups.forEach((group) => {
      const btn = group.querySelector(".nav-group-btn");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const next = !group.classList.contains("is-open");
        setGroupOpen(group, next);
        const map = loadState();
        map[group.dataset.groupId] = next;
        saveState(map);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGroups);
  } else {
    initGroups();
  }
})();
