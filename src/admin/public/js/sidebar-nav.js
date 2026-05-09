/**
 * Grouped admin sidebar: collapse state + mobile drawer.
 * Menu structure lives in views/partials/sidebar-nav.ejs — add groups/items there.
 */
(function () {
  const STORAGE_KEY = "adminSidebarGroupsV1";
  const shell = document.querySelector(".admin-shell");
  const sidebar = document.querySelector(".sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const menuBtn = document.getElementById("sidebar-menu-btn");

  function loadStoredState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveStoredState(map) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function setGroupOpen(groupEl, open) {
    groupEl.classList.toggle("is-open", open);
    const btn = groupEl.querySelector(".nav-group__toggle");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function initGroups() {
    const groups = document.querySelectorAll(".nav-group[data-group-id]");
    if (!groups.length) return;

    const stored = loadStoredState();

    groups.forEach((group) => {
      const id = group.dataset.groupId;
      const hasActive = Boolean(group.querySelector(".nav-link.active"));
      const hasActiveClass = group.classList.contains("has-active");
      let open = stored[id];
      if (typeof open !== "boolean") {
        open = hasActive || hasActiveClass;
      }
      if (hasActive) open = true;
      setGroupOpen(group, open);
    });

    groups.forEach((group) => {
      const toggle = group.querySelector(".nav-group__toggle");
      if (!toggle) return;
      toggle.addEventListener("click", () => {
        const next = !group.classList.contains("is-open");
        setGroupOpen(group, next);
        const map = loadStoredState();
        map[group.dataset.groupId] = next;
        saveStoredState(map);
      });
    });
  }

  function setDrawerOpen(open) {
    if (!shell) return;
    shell.classList.toggle("nav-drawer-open", open);
    document.body.classList.toggle("admin-sidebar-open", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (backdrop) backdrop.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function initDrawer() {
    if (!shell || !menuBtn) return;

    menuBtn.addEventListener("click", () => {
      const open = !shell.classList.contains("nav-drawer-open");
      setDrawerOpen(open);
    });

    if (backdrop) {
      backdrop.addEventListener("click", () => setDrawerOpen(false));
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && shell.classList.contains("nav-drawer-open")) {
        setDrawerOpen(false);
      }
    });

    sidebar?.querySelectorAll("a.nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 900px)").matches) setDrawerOpen(false);
      });
    });

    window.addEventListener("resize", () => {
      if (!window.matchMedia("(max-width: 900px)").matches) setDrawerOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initGroups();
      initDrawer();
    });
  } else {
    initGroups();
    initDrawer();
  }
})();
