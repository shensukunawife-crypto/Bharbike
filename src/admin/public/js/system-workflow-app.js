/**
 * BhaरBike — full-width vertical animated workflow story
 * React 18 + Framer Motion · optional Mapbox GL
 */
import React, { useEffect, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { motion, useReducedMotion } from "https://esm.sh/framer-motion@11.11.17?deps=react@18.3.1,react-dom@18.3.1";

const e = React.createElement;

const BRAND_NAME =
  typeof window !== "undefined" && window.__BRAND_NAME__
    ? window.__BRAND_NAME__
    : "Bhaर";
const BRAND_PRODUCT_NAME =
  typeof window !== "undefined" && window.__BRAND_PRODUCT_NAME__
    ? window.__BRAND_PRODUCT_NAME__
    : BRAND_NAME + "Bike";

const ink = "#0a0a0a";
const stroke = { stroke: ink, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" };
const ADMIN_LINE = "#818cf8";
const ADMIN_SOFT = "#a78bfa";
const RIDER_LINE = "#22c55e";
const RIDER_SOFT = "#4ade80";

function FlowBridge({ text, variant = "user" }) {
  const bridgeClass =
    "sw-v-bridge" +
    (variant === "admin" ? " sw-v-bridge--admin" : "") +
    (variant === "rider" ? " sw-v-bridge--rider" : "");
  const dashStroke =
    variant === "admin"
      ? "rgba(129,140,248,0.55)"
      : variant === "rider"
        ? "rgba(34,197,94,0.55)"
        : "rgba(255,106,0,0.55)";
  const chevronStroke =
    variant === "admin" ? "#a78bfa" : variant === "rider" ? RIDER_SOFT : "#ff8533";
  return e(
    "div",
    { className: bridgeClass, "aria-hidden": true },
    e(
      motion.svg,
      {
        width: 44,
        height: 44,
        viewBox: "0 0 44 44",
        animate: { opacity: [0.65, 1, 0.65] },
        transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
      },
      e("path", {
        d: "M22 6 V34",
        fill: "none",
        stroke: dashStroke,
        strokeWidth: 2.5,
        strokeLinecap: "round",
        strokeDasharray: "5 7",
      }),
      e(
        motion.g,
        { animate: { y: [0, 5, 0] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } },
        e("path", {
          d: "M12 36 L22 44 L32 36",
          fill: "none",
          stroke: chevronStroke,
          strokeWidth: 2.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
      ),
    ),
    e("span", null, text),
  );
}

function FloatWrap({ children, delay = 0 }) {
  const reduce = useReducedMotion();
  return e(
    motion.div,
    {
      animate: reduce ? {} : { y: [0, -10, 0] },
      transition: { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay },
    },
    children,
  );
}

function Hero({ flowMode }) {
  const reduce = useReducedMotion();
  const sub =
    flowMode === "admin"
      ? "Fleet, IoT, payouts, and rider oversight — the console that turns rentals into operations."
      : flowMode === "rider"
        ? `Same renter account levels up: apply → KYC → approved → online → ${BRAND_PRODUCT_NAME} fleet jobs → earnings.`
        : `Rent path: subscribe → pay → unlock ${BRAND_PRODUCT_NAME} → ride → live tracking.`;
  const scrollStroke =
    flowMode === "admin" ? ADMIN_LINE : flowMode === "rider" ? RIDER_LINE : "#ff6a00";
  return e(
    motion.header,
    {
      className: "sw-v-hero",
      initial: reduce ? false : { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
    e(
      "span",
      { className: "sw-v-hero-kicker" },
      flowMode === "admin" ? "Admin workflow" : flowMode === "rider" ? "Rider workflow" : "User workflow",
    ),
    e(
      "h1",
      { className: "sw-v-hero-title" },
      flowMode === "admin"
        ? "Operate fleet & partner payouts"
        : flowMode === "rider"
          ? `Earn with the ${BRAND_PRODUCT_NAME} fleet`
          : "From subscribe to unlock & ride",
    ),
    e("p", { className: "sw-v-hero-sub" }, sub),
    e(
      "div",
      { className: "sw-v-scroll-hint" },
      e("span", null, "Scroll"),
      e(
        "svg",
        {
          width: 22,
          height: 22,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: scrollStroke,
          strokeWidth: "2",
        },
        e("path", { d: "M12 5v14M5 13l7 7 7-7" }),
      ),
    ),
  );
}

/** Flat 2.5D user — gradients, rim light, grounded shadow */
function CharUser({ style, uid = "u" }) {
  const gid = (n) => `${n}-${uid}`;
  return e(
    "svg",
    {
      className: "sw-v-cutout",
      viewBox: "0 0 260 360",
      width: 230,
      height: 318,
      style,
      role: "img",
      "aria-label": "App user",
    },
    e("defs", null,
      e("linearGradient", { id: gid("skin"), x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
        e("stop", { offset: "0%", stopColor: "#fde68a" }),
        e("stop", { offset: "55%", stopColor: "#fdba74" }),
        e("stop", { offset: "100%", stopColor: "#ea9a5c" }),
      ),
      e("linearGradient", { id: gid("jacket"), x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
        e("stop", { offset: "0%", stopColor: "#ff8533" }),
        e("stop", { offset: "45%", stopColor: "#ff6a00" }),
        e("stop", { offset: "100%", stopColor: "#c2410c" }),
      ),
      e("linearGradient", { id: gid("denim"), x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
        e("stop", { offset: "0%", stopColor: "#334155" }),
        e("stop", { offset: "100%", stopColor: "#1e293b" }),
      ),
      e("filter", { id: gid("soft") },
        e("feGaussianBlur", { stdDeviation: 1.2, result: "b" }),
        e("feMerge", null, e("feMergeNode", { in: "b" }), e("feMergeNode", { in: "SourceGraphic" })),
      ),
    ),
    e("ellipse", { cx: 130, cy: 322, rx: 88, ry: 16, fill: "rgba(0,0,0,0.45)" }),
    e("path", { d: "M 92 286 L 92 318 L 108 318 L 112 286 Z", fill: "#171717", stroke: ink, strokeWidth: 2 }),
    e("path", { d: "M 148 286 L 148 318 L 164 318 L 168 286 Z", fill: "#171717", stroke: ink, strokeWidth: 2 }),
    e("path", {
      d: "M 102 210 L 98 292 L 118 296 L 126 218 Z M 138 218 L 146 296 L 166 292 L 162 210 Z",
      fill: `url(#${gid("denim")})`,
      stroke: ink,
      strokeWidth: 2.5,
      strokeLinejoin: "round",
    }),
    e("path", {
      d: "M 98 148 Q 130 132 162 148 L 172 218 Q 130 232 88 218 Z",
      fill: `url(#${gid("jacket")})`,
      stroke: ink,
      strokeWidth: 3,
      strokeLinejoin: "round",
      filter: `url(#${gid("soft")})`,
    }),
    e("path", {
      d: "M 104 156 L 118 154 L 122 200 L 108 204 Z",
      fill: "rgba(255,255,255,0.22)",
      opacity: 0.9,
    }),
    e("path", {
      d: "M 82 168 Q 72 188 78 212",
      fill: "none",
      stroke: ink,
      strokeWidth: 14,
      strokeLinecap: "round",
    }),
    e("path", {
      d: "M 82 168 Q 72 188 78 212",
      fill: "none",
      stroke: "#fdba74",
      strokeWidth: 10,
      strokeLinecap: "round",
    }),
    e("circle", { cx: 130, cy: 92, r: 46, fill: `url(#${gid("skin")})`, stroke: ink, strokeWidth: 3 }),
    e("path", { d: "M 92 76 Q 130 52 168 76 Q 130 64 92 76", fill: "#27272a", stroke: ink, strokeWidth: 2 }),
    e("ellipse", { cx: 112, cy: 94, rx: 7, ry: 9, fill: "#fff", opacity: 0.95 }),
    e("ellipse", { cx: 150, cy: 94, rx: 7, ry: 9, fill: "#fff", opacity: 0.95 }),
    e("circle", { cx: 114, cy: 96, r: 4, fill: ink }),
    e("circle", { cx: 152, cy: 96, r: 4, fill: ink }),
    e("circle", { cx: 116, cy: 93, r: 1.8, fill: "#fff" }),
    e("circle", { cx: 154, cy: 93, r: 1.8, fill: "#fff" }),
    e("path", { d: "M 118 118 Q 130 126 142 118", fill: "none", stroke: ink, strokeWidth: 2.5, strokeLinecap: "round" }),
  );
}

/** Same persona as CharUser — vest + helmet + thermal bag for fleet partner runs */
function CharRider({ style, uid = "r" }) {
  const gid = (n) => `${n}-${uid}`;
  return e(
    "svg",
    {
      className: "sw-v-cutout",
      viewBox: "0 0 260 360",
      width: 230,
      height: 318,
      style,
      role: "img",
      "aria-label": `Delivery partner with ${BRAND_PRODUCT_NAME} gear`,
    },
    e("defs", null,
      e("linearGradient", { id: gid("skin"), x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
        e("stop", { offset: "0%", stopColor: "#fde68a" }),
        e("stop", { offset: "55%", stopColor: "#fdba74" }),
        e("stop", { offset: "100%", stopColor: "#ea9a5c" }),
      ),
      e("linearGradient", { id: gid("vest"), x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
        e("stop", { offset: "0%", stopColor: "#15803d" }),
        e("stop", { offset: "50%", stopColor: "#22c55e" }),
        e("stop", { offset: "100%", stopColor: "#166534" }),
      ),
      e("linearGradient", { id: gid("denim"), x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
        e("stop", { offset: "0%", stopColor: "#334155" }),
        e("stop", { offset: "100%", stopColor: "#1e293b" }),
      ),
      e("linearGradient", { id: gid("bag"), x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
        e("stop", { offset: "0%", stopColor: "#064e3b" }),
        e("stop", { offset: "100%", stopColor: "#022c22" }),
      ),
      e("filter", { id: gid("soft") },
        e("feGaussianBlur", { stdDeviation: 1.2, result: "b" }),
        e("feMerge", null, e("feMergeNode", { in: "b" }), e("feMergeNode", { in: "SourceGraphic" })),
      ),
    ),
    e("ellipse", { cx: 130, cy: 322, rx: 88, ry: 16, fill: "rgba(0,0,0,0.45)" }),
    e("path", {
      d: "M 72 175 L 68 248 L 94 252 L 102 182 Z",
      fill: `url(#${gid("bag")})`,
      stroke: ink,
      strokeWidth: 3,
      strokeLinejoin: "round",
    }),
    e("path", { d: "M 78 188 L 98 184 L 96 230 L 82 232 Z", fill: "#059669", stroke: ink, strokeWidth: 2 }),
    e("path", { d: "M 92 286 L 92 318 L 108 318 L 112 286 Z", fill: "#171717", stroke: ink, strokeWidth: 2 }),
    e("path", { d: "M 148 286 L 148 318 L 164 318 L 168 286 Z", fill: "#171717", stroke: ink, strokeWidth: 2 }),
    e("path", {
      d: "M 102 210 L 98 292 L 118 296 L 126 218 Z M 138 218 L 146 296 L 166 292 L 162 210 Z",
      fill: `url(#${gid("denim")})`,
      stroke: ink,
      strokeWidth: 2.5,
      strokeLinejoin: "round",
    }),
    e("path", {
      d: "M 98 148 Q 130 132 162 148 L 172 218 Q 130 232 88 218 Z",
      fill: `url(#${gid("vest")})`,
      stroke: ink,
      strokeWidth: 3,
      strokeLinejoin: "round",
      filter: `url(#${gid("soft")})`,
    }),
    e("rect", { x: 118, y: 168, width: 24, height: 8, rx: 3, fill: "#bbf7d0", opacity: 0.95 }),
    e("path", {
      d: "M 104 156 L 118 154 L 122 200 L 108 204 Z",
      fill: "rgba(255,255,255,0.18)",
      opacity: 0.85,
    }),
    e("path", {
      d: "M 82 168 Q 72 188 78 212",
      fill: "none",
      stroke: ink,
      strokeWidth: 14,
      strokeLinecap: "round",
    }),
    e("path", {
      d: "M 82 168 Q 72 188 78 212",
      fill: "none",
      stroke: "#fdba74",
      strokeWidth: 10,
      strokeLinecap: "round",
    }),
    e("circle", { cx: 130, cy: 92, r: 46, fill: `url(#${gid("skin")})`, stroke: ink, strokeWidth: 3 }),
    e("path", { d: "M 92 76 Q 130 52 168 76 Q 130 64 92 76", fill: "#27272a", stroke: ink, strokeWidth: 2 }),
    e("ellipse", { cx: 112, cy: 94, rx: 7, ry: 9, fill: "#fff", opacity: 0.95 }),
    e("ellipse", { cx: 150, cy: 94, rx: 7, ry: 9, fill: "#fff", opacity: 0.95 }),
    e("circle", { cx: 114, cy: 96, r: 4, fill: ink }),
    e("circle", { cx: 152, cy: 96, r: 4, fill: ink }),
    e("path", { d: "M 118 118 Q 130 126 142 118", fill: "none", stroke: ink, strokeWidth: 2.5, strokeLinecap: "round" }),
    e("path", {
      d: "M 78 58 Q 130 38 182 58 Q 130 46 78 58",
      fill: "#14532d",
      stroke: ink,
      strokeWidth: 3,
    }),
    e("path", {
      d: "M 84 62 Q 130 48 176 62 L 172 78 Q 130 68 88 78 Z",
      fill: "#166534",
      stroke: ink,
      strokeWidth: 2.5,
    }),
    e("path", {
      d: "M 92 72 Q 130 62 168 72",
      fill: "none",
      stroke: "rgba(255,255,255,0.35)",
      strokeWidth: 4,
      strokeLinecap: "round",
    }),
  );
}

function CharAdmin({ style, uid = "a" }) {
  const gid = (n) => `${n}-${uid}`;
  return e(
    "svg",
    {
      className: "sw-v-cutout",
      viewBox: "0 0 260 360",
      width: 220,
      height: 304,
      style,
      role: "img",
      "aria-label": "Operations admin",
    },
    e("defs", null,
      e("linearGradient", { id: gid("skin"), x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
        e("stop", { offset: "0%", stopColor: "#fde68a" }),
        e("stop", { offset: "100%", stopColor: "#fdba74" }),
      ),
      e("linearGradient", { id: gid("blazer"), x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
        e("stop", { offset: "0%", stopColor: "#64748b" }),
        e("stop", { offset: "100%", stopColor: "#334155" }),
      ),
    ),
    e("ellipse", { cx: 130, cy: 322, rx: 88, ry: 16, fill: "rgba(0,0,0,0.45)" }),
    e("path", { d: "M 94 286 L 92 318 L 110 318 L 118 286 Z", fill: "#171717", stroke: ink, strokeWidth: 2 }),
    e("path", { d: "M 142 286 L 150 318 L 168 318 L 166 286 Z", fill: "#171717", stroke: ink, strokeWidth: 2 }),
    e("path", {
      d: "M 104 218 L 98 292 L 162 292 L 156 218 Z",
      fill: "#1e293b",
      stroke: ink,
      strokeWidth: 2.5,
      strokeLinejoin: "round",
    }),
    e("path", {
      d: "M 94 148 Q 130 130 166 148 L 178 228 Q 130 246 82 228 Z",
      fill: `url(#${gid("blazer")})`,
      stroke: ink,
      strokeWidth: 3,
      strokeLinejoin: "round",
    }),
    e("path", { d: "M 118 168 L 142 168 L 138 208 L 122 208 Z", fill: "#f8fafc", stroke: ink, strokeWidth: 2 }),
    e("path", { d: "M 126 168 L 134 168 L 132 188 Z", fill: "#94a3b8" }),
    e("circle", { cx: 130, cy: 96, r: 44, fill: `url(#${gid("skin")})`, stroke: ink, strokeWidth: 3 }),
    e("path", { d: "M 96 78 Q 130 58 164 78", fill: "#27272a", stroke: ink, strokeWidth: 2 }),
    e("rect", { x: 72, y: 68, width: 116, height: 28, rx: 10, fill: "#1e293b", stroke: ink, strokeWidth: 2 }),
    e("rect", { x: 84, y: 76, width: 92, height: 12, rx: 4, fill: "#475569" }),
    e("ellipse", { cx: 114, cy: 98, rx: 6, ry: 8, fill: "#fff" }),
    e("ellipse", { cx: 146, cy: 98, rx: 6, ry: 8, fill: "#fff" }),
    e("circle", { cx: 116, cy: 100, r: 3.5, fill: ink }),
    e("circle", { cx: 148, cy: 100, r: 3.5, fill: ink }),
    e("path", { d: "M 76 188 Q 68 210 74 232", fill: "none", stroke: ink, strokeWidth: 12, strokeLinecap: "round" }),
    e("path", { d: "M 76 188 Q 68 210 74 232", fill: "none", stroke: "#cbd5e1", strokeWidth: 8, strokeLinecap: "round" }),
    e("rect", { x: 52, y: 216, width: 36, height: 48, rx: 8, fill: "#e2e8f0", stroke: ink, strokeWidth: 2.5 }),
    e("rect", { x: 58, y: 224, width: 24, height: 6, rx: 2, fill: "#94a3b8" }),
    e("rect", { x: 58, y: 236, width: 24, height: 6, rx: 2, fill: "#94a3b8" }),
  );
}

/** Side-view rental bike + lock badge (cutout style) */
function CharBikeSide({ unlocked }) {
  const glow = unlocked;
  return e(
    motion.div,
    {
      className: "sw-v-cutout",
      style: { position: "relative", display: "inline-block", width: "min(100%, 300px)" },
      animate: glow
        ? { filter: ["drop-shadow(0 0 18px rgba(255,106,0,0.35))", "drop-shadow(0 0 42px rgba(255,106,0,0.85))"] }
        : { filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.45))" },
      transition: glow ? { duration: 1.1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } : { duration: 0.3 },
    },
    e(
      "svg",
      {
        viewBox: "0 0 340 220",
        width: "100%",
        height: "auto",
        display: "block",
        role: "img",
        "aria-label": "Rental bike",
      },
      e("ellipse", { cx: 170, cy: 198, rx: 130, ry: 12, fill: "rgba(0,0,0,0.35)" }),
      e("circle", { cx: 72, cy: 172, r: 36, fill: "#1a1a1a", stroke: ink, strokeWidth: 5 }),
      e("circle", { cx: 268, cy: 172, r: 36, fill: "#1a1a1a", stroke: ink, strokeWidth: 5 }),
      e("path", {
        d: "M 72 172 L 120 172 L 150 108 L 248 108 L 268 172",
        fill: "none",
        stroke: unlocked ? "#ff6a00" : "#e5e5e5",
        strokeWidth: 8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
      e("path", { d: "M 150 108 L 145 78 L 175 72 L 188 100", fill: "none", stroke: ink, strokeWidth: 5, strokeLinecap: "round" }),
      e("circle", { cx: 188, cy: 102, r: 28, fill: "#262626", stroke: ink, strokeWidth: 4 }),
    ),
    e(
      motion.div,
      {
        style: {
          position: "absolute",
          right: "14%",
          top: "26%",
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "#ffffff",
          border: `3px solid ${ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          lineHeight: 1,
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
          userSelect: "none",
        },
        animate: unlocked ? { scale: [1, 1.15, 1], rotate: [0, -6, 0] } : {},
        transition: { duration: 0.55 },
        key: unlocked ? "open" : "shut",
      },
      unlocked ? "🔓" : "🔒",
    ),
  );
}

function ArtBikeUnlock() {
  const reduce = useReducedMotion();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rideStatus, setRideStatus] = useState("");

  const requestUnlock = async () => {
    if (loading || unlocked) return;
    setErr("");
    setLoading(true);
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("adminToken") : "";
      const res = await fetch("/api/workflow/story-unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setErr("Admin login required.");
        setLoading(false);
        return;
      }
      if (data.verified) {
        setUnlocked(true);
        setRideStatus(data.rideStatus || "Ride Started");
      } else {
        setErr(data.message || "Payment not verified for unlock.");
      }
    } catch {
      setErr("Network error — try again.");
    }
    setLoading(false);
  };

  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 320, pointerEvents: "auto" } },
    e(
      motion.div,
      {
        initial: reduce ? false : { opacity: 0, x: -32 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true, amount: 0.35 },
      },
      e(FloatWrap, { delay: 0.2 }, e(CharUser, { uid: "unlock", style: { marginLeft: "-8%", transform: "scale(0.92)" } })),
    ),
    e(
      motion.div,
      {
        initial: reduce ? false : { opacity: 0, x: 28 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true, amount: 0.35 },
        transition: { delay: 0.08 },
        style: { marginRight: "-4%" },
      },
      e(CharBikeSide, { unlocked }),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { left: "50%", top: "8%", transform: "translateX(-50%) rotate(-3deg)" },
        initial: reduce ? false : { opacity: 0, y: -16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e(
        "div",
        {
          style: {
            width: 128,
            padding: "12px 10px 16px",
            borderRadius: 24,
            background: "linear-gradient(165deg,#111,#1a1a1a)",
            border: "3px solid #333",
            boxShadow: "0 20px 40px rgba(0,0,0,0.55)",
          },
        },
        e("div", { style: { height: 8, width: "45%", margin: "0 auto 10px", borderRadius: 4, background: "#333" } }),
        e(
          "div",
          {
            style: {
              height: 118,
              borderRadius: 12,
              background: "linear-gradient(180deg,#0f172a,#1e293b)",
              border: "2px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
            },
          },
          e(
            motion.button,
            {
              type: "button",
              onClick: requestUnlock,
              disabled: loading || unlocked,
              style: {
                padding: "12px 18px",
                borderRadius: 999,
                border: `3px solid ${ink}`,
                background: unlocked ? "#22c55e" : "#ff6a00",
                color: unlocked ? "#fff" : "#111",
                fontWeight: 800,
                fontSize: 12,
                cursor: unlocked ? "default" : "pointer",
                opacity: loading ? 0.75 : 1,
              },
              whileTap: unlocked || loading ? {} : { scale: 0.95 },
              animate:
                reduce || unlocked
                  ? {}
                  : { boxShadow: ["0 0 0 0 rgba(255,106,0,0.45)", "0 0 0 12px rgba(255,106,0,0)", "0 0 0 0 rgba(255,106,0,0)"] },
              transition: { duration: 2, repeat: unlocked ? 0 : Infinity },
            },
            loading ? "Checking…" : unlocked ? "Unlocked ✓" : "Unlock Bike",
          ),
        ),
      ),
    ),
    rideStatus &&
      e(
        motion.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          style: {
            position: "absolute",
            bottom: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 28px",
            borderRadius: 999,
            background: "rgba(34,197,94,0.2)",
            border: "2px solid #22c55e",
            color: "#86efac",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: "0.02em",
          },
        },
        rideStatus,
      ),
    err &&
      e(
        "div",
        {
          style: {
            position: "absolute",
            bottom: "4%",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: 360,
            textAlign: "center",
            fontSize: 13,
            color: "#fca5a5",
            padding: "0 16px",
          },
        },
        err,
      ),
  );
}

function ArtBooking() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300 } },
    e(
      motion.div,
      {
        initial: reduce ? false : { opacity: 0, x: -40 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true, amount: 0.35 },
        transition: { duration: 0.65 },
      },
      e(FloatWrap, null, e(CharUser, { uid: "book", style: { marginLeft: "-12%" } })),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "8%", top: "18%", transform: "rotate(-4deg)" },
        initial: reduce ? false : { opacity: 0, scale: 0.85, y: 30 },
        whileInView: { opacity: 1, scale: 1, y: 0 },
        viewport: { once: true, amount: 0.35 },
        transition: { type: "spring", stiffness: 280, damping: 22, delay: 0.1 },
      },
      e(
        motion.div,
        { style: { position: "relative" }, animate: reduce ? {} : { y: [0, -7, 0] }, transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } },
        e(
          motion.div,
          {
            style: {
              width: 132,
              height: 244,
              borderRadius: 28,
              background: "linear-gradient(165deg,#111,#1f1f1f)",
              border: "4px solid #2a2a2a",
              boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
            },
          },
          e("div", {
            style: {
              margin: "14px auto 0",
              width: "72%",
              height: 10,
              borderRadius: 6,
              background: "#333",
            },
          }),
          e(
            "div",
            {
              style: {
                margin: "14px 14px 0",
                height: 148,
                borderRadius: 14,
                background: "linear-gradient(180deg,#0f172a,#1e293b)",
                border: "2px solid #334155",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              },
            },
            e("span", { style: { color: "#94a3b8", fontSize: 11, fontWeight: 700 } }, BRAND_PRODUCT_NAME),
            e(
              motion.div,
              {
                className: "sw-v-tap-btn",
                style: { padding: "12px 22px", fontSize: 13 },
                animate: reduce
                  ? {}
                  : {
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        "0 6px 24px rgba(255,106,0,0.35)",
                        "0 6px 36px rgba(255,106,0,0.55)",
                        "0 6px 24px rgba(255,106,0,0.35)",
                      ],
                    },
                transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
              },
              "Subscribe ₹2999",
            ),
          ),
        ),
        e(
          motion.div,
          {
            style: {
              position: "absolute",
              bottom: -28,
              right: 22,
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "3px solid #fff",
              background: "rgba(255,106,0,0.35)",
            },
            animate: reduce ? {} : { scale: [1, 1.25, 1], opacity: [1, 0.85, 1] },
            transition: { duration: 1.4, repeat: Infinity },
          },
        ),
      ),
    ),
    e(
      motion.div,
      {
        style: {
          position: "absolute",
          left: "42%",
          top: "42%",
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: "2px solid rgba(255,106,0,0.5)",
        },
        initial: reduce ? false : { scale: 0.5, opacity: 0 },
        whileInView: { scale: [0.5, 1.4], opacity: [0.8, 0] },
        viewport: { once: false, amount: 0.5 },
        transition: { duration: 1.8, repeat: Infinity, repeatDelay: 0.4 },
      },
    ),
  );
}

function ArtBackend() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    ...[0, 1, 2].map((i) =>
      e(
        motion.div,
        {
          key: i,
          style: {
            position: "absolute",
            left: `${28 + i * 22}%`,
            top: `${26 + (i % 2) * 8}%`,
          },
          initial: reduce ? false : { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { delay: i * 0.12 },
        },
        e(
          "svg",
          { width: 100, height: 140, viewBox: "0 0 100 140", className: "sw-v-cutout" },
          e("rect", { width: 88, height: 130, x: 6, y: 6, rx: 10, fill: "#cbd5e1", ...stroke }),
          e("circle", { cx: 34, cy: 34, r: 8, fill: "#22c55e", stroke: ink, strokeWidth: 2 }),
          e("circle", { cx: 62, cy: 34, r: 8, fill: "#ff6a00", stroke: ink, strokeWidth: 2 }),
          e("rect", { x: 22, y: 56, width: 56, height: 10, rx: 3, fill: "#64748b", stroke: ink, strokeWidth: 2 }),
          e("rect", { x: 22, y: 76, width: 56, height: 10, rx: 3, fill: "#64748b", stroke: ink, strokeWidth: 2 }),
        ),
      ),
    ),
    ...[0, 1, 2, 3].map((i) =>
      e(motion.div, {
        key: `pkt-${i}`,
        style: {
          position: "absolute",
          top: `${38 + (i % 2) * 18}%`,
          left: "12%",
          width: 44,
          height: 16,
          borderRadius: 8,
          background: "#ff6a00",
          border: `3px solid ${ink}`,
          boxShadow: "0 4px 12px rgba(255,106,0,0.35)",
        },
        animate: reduce ? {} : { left: ["12%", "78%"], opacity: [0, 1, 1, 0] },
        transition: { duration: 3.2, repeat: Infinity, delay: i * 0.55, ease: "linear" },
      }),
    ),
    e(
      "svg",
      {
        className: "sw-v-cutout",
        style: { position: "absolute", width: "56%", height: 120, bottom: "14%", left: "22%", opacity: 0.85 },
        viewBox: "0 0 400 120",
      },
      e(motion.path, {
        d: "M 20 60 Q 100 20 200 60 T 380 60",
        fill: "none",
        stroke: "rgba(255,106,0,0.55)",
        strokeWidth: 4,
        strokeLinecap: "round",
        strokeDasharray: "12 10",
        initial: reduce ? false : { pathLength: 0 },
        whileInView: { pathLength: 1 },
        viewport: { once: true },
        transition: { duration: 1.4 },
      }),
    ),
  );
}

function ArtRazorpay() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300 } },
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { position: "relative", transform: "rotate(2deg)" },
        initial: reduce ? false : { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { type: "spring", stiffness: 200, damping: 22 },
      },
      e(
        "div",
        {
          style: {
            width: "min(320px, 92vw)",
            borderRadius: 16,
            overflow: "hidden",
            border: "4px solid rgba(255,255,255,0.12)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.55), 0 0 40px rgba(255,106,0,0.12)",
          },
        },
        e(
          "div",
          { style: { background: "linear-gradient(90deg,#3395ff,#2563eb)", padding: "14px 18px", fontWeight: 800, color: "#fff", fontSize: 15 } },
          "Razorpay · Secure pay",
        ),
        e("div", { style: { background: "#141414", padding: "22px 20px" } },
          e("div", { style: { color: "#9ca3af", fontSize: 12, marginBottom: 8 } }, BRAND_PRODUCT_NAME + " subscription"),
          e("div", { style: { color: "#fff", fontSize: 26, fontWeight: 800 } }, "₹2,999"),
          e(
            motion.div,
            {
              style: {
                marginTop: 18,
                height: 48,
                borderRadius: 12,
                background: "#22c55e",
                border: `3px solid ${ink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontWeight: 800,
                color: "#fff",
              },
              initial: reduce ? false : { scale: 0.92 },
              whileInView: { scale: 1 },
              viewport: { once: true },
              transition: { delay: 0.35, type: "spring", stiffness: 400 },
            },
            e(
              motion.svg,
              { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 3 },
              e(motion.path, {
                d: "M5 13l5 5L20 7",
                initial: reduce ? false : { pathLength: 0 },
                whileInView: { pathLength: 1 },
                viewport: { once: true },
                transition: { delay: 0.55, duration: 0.35 },
              }),
            ),
            "Paid",
          ),
        ),
      ),
    ),
  );
}

function ArtDatabase() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    e(
      motion.svg,
      {
        className: "sw-v-cutout",
        viewBox: "0 0 280 220",
        style: { width: "min(100%, 320px)", height: "auto" },
        initial: reduce ? false : { opacity: 0, scale: 0.94 },
        whileInView: { opacity: 1, scale: 1 },
        viewport: { once: true },
      },
      e("ellipse", { cx: 140, cy: 48, rx: 88, ry: 26, fill: "#7c3aed", stroke: ink, strokeWidth: 4 }),
      e("path", { d: "M52 48 V172 A88 26 0 0 0 228 172 V48", fill: "#a78bfa", ...stroke }),
      e("ellipse", { cx: 140, cy: 172, rx: 88, ry: 26, fill: "#6d28d9", stroke: ink, strokeWidth: 4 }),
      e("text", { x: 140, y: 210, textAnchor: "middle", fill: "#e9d5ff", fontSize: 14, fontWeight: 800 }, "SUPABASE"),
      ...[0, 1, 2, 3].map((i) =>
        e(
          motion.rect,
          {
            key: i,
            x: 88,
            y: 78 + i * 18,
            width: 104,
            height: 12,
            rx: 4,
            fill: "#ffe066",
            stroke: ink,
            strokeWidth: 3,
            initial: reduce ? false : { opacity: 0, y: -16 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { delay: 0.15 + i * 0.1, type: "spring", stiffness: 300 },
          },
        ),
      ),
    ),
  );
}

function ArtAdminDash() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300 } },
    e(
      motion.div,
      {
        initial: reduce ? false : { opacity: 0, x: -28 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true },
      },
      e(FloatWrap, { delay: 0.35 }, e(CharAdmin, { uid: "ops" })),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "6%", top: "12%", width: "min(92%, 440px)" },
        initial: reduce ? false : { opacity: 0, y: -20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { delay: 0.15 },
      },
      e(
        "div",
        {
          style: {
            borderRadius: 12,
            border: "2px solid rgba(255,255,255,0.08)",
            background: "rgba(20,20,22,0.92)",
            backdropFilter: "blur(12px)",
            padding: 16,
            boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
          },
        },
        e("div", { style: { height: 8, width: "40%", borderRadius: 4, background: "#333", marginBottom: 14 } }),
        e("div", { style: { height: 6, width: "75%", borderRadius: 4, background: "#262626", marginBottom: 8 } }),
        e("div", { style: { height: 6, width: "60%", borderRadius: 4, background: "#262626", marginBottom: 18 } }),
        e("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
          e("div", { style: { height: 64, borderRadius: 10, background: "#1a1a1c", border: "1px solid #333" } }),
          e("div", { style: { height: 64, borderRadius: 10, background: "#1a1a1c", border: "1px solid #333" } }),
        ),
      ),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "10%", top: "46%" },
        initial: reduce ? false : { opacity: 0, scale: 0.7, rotate: -6 },
        whileInView: { opacity: 1, scale: 1, rotate: 0 },
        viewport: { once: true },
        transition: { delay: 0.45, type: "spring", stiffness: 360 },
      },
      e(
        "div",
        {
          style: {
            padding: "14px 20px",
            borderRadius: 14,
            background: "linear-gradient(135deg,#ff6a00,#ff8533)",
            border: `3px solid ${ink}`,
            fontWeight: 800,
            fontSize: 14,
            color: "#111",
            boxShadow: "0 16px 32px rgba(255,106,0,0.35)",
          },
        },
        "🔔 New paid subscription",
        e("div", { style: { fontSize: 11, fontWeight: 700, marginTop: 6, opacity: 0.85 } }, "Fleet / ops review"),
      ),
    ),
  );
}

/** Admin workflow story — A1 dashboard stats */
function ArtAdminA1Dashboard() {
  const reduce = useReducedMotion();
  const stat = (label, val, sub) =>
    e(
      "div",
      {
        key: label,
        style: {
          borderRadius: 12,
          padding: "14px 16px",
          background: "rgba(17,17,20,0.95)",
          border: "1px solid rgba(129,140,248,0.35)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.4)",
        },
      },
      e("div", { style: { fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.06em" } }, label),
      e("div", { style: { fontSize: 26, fontWeight: 900, color: "#fff", marginTop: 6, letterSpacing: "-0.02em" } }, val),
      e("div", { style: { fontSize: 11, color: "#71717a", marginTop: 4 } }, sub),
    );
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 320 } },
    e(
      motion.div,
      { initial: reduce ? false : { opacity: 0, x: -20 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true } },
      e(FloatWrap, { delay: 0.2 }, e(CharAdmin, { uid: "a1dash" })),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "5%", top: "10%", width: "min(94%, 420px)" },
        initial: reduce ? false : { opacity: 0, y: -16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { delay: 0.08 },
      },
      e(
        "div",
        {
          style: {
            borderRadius: 14,
            border: "2px solid rgba(129,140,248,0.25)",
            background: "linear-gradient(165deg, rgba(99,102,241,0.12), rgba(12,12,14,0.92))",
            padding: 18,
            backdropFilter: "blur(14px)",
          },
        },
        e("div", { style: { fontWeight: 900, fontSize: 15, color: "#e0e7ff", marginBottom: 14 } }, "Fleet overview"),
        e("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } },
          stat("Bikes", "42", "28 live · 14 staging"),
          stat("Users", "1.2k", "+86 this week"),
          stat("Earnings", "₹4.8L", "MTD · subscriptions"),
        ),
      ),
    ),
  );
}

function ArtAdminA2AddBike() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300 } },
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { left: "6%", top: "8%", width: "min(92%, 340px)" },
        initial: reduce ? false : { opacity: 0, scale: 0.96, rotate: -1 },
        whileInView: { opacity: 1, scale: 1, rotate: 0 },
        viewport: { once: true },
        transition: { type: "spring", stiffness: 280, damping: 24 },
      },
      e(
        "div",
        {
          style: {
            borderRadius: 16,
            border: `3px solid ${ink}`,
            background: "#141416",
            overflow: "hidden",
            boxShadow: "0 28px 56px rgba(0,0,0,0.55), 0 0 40px rgba(129,140,248,0.15)",
          },
        },
        e(
          "div",
          { style: { padding: "16px 18px", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", fontWeight: 900, color: "#fff", fontSize: 14 } },
          "Add Bike",
        ),
        e("div", { style: { padding: "18px 18px 16px" } },
          ["Model", "Plate / ID", "Hub"].map((lab, i) =>
            e("div", { key: lab, style: { marginBottom: i < 2 ? 12 : 14 } },
              e("div", { style: { fontSize: 11, fontWeight: 700, color: "#71717a", marginBottom: 6 } }, lab),
              e("div", { style: { height: 38, borderRadius: 10, background: "#1c1c1f", border: "1px solid #333" } }),
            ),
          ),
          e(
            motion.div,
            {
              style: {
                height: 46,
                borderRadius: 12,
                background: ADMIN_LINE,
                border: `3px solid ${ink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "#0a0a0a",
              },
              whileHover: reduce ? {} : { scale: 1.02 },
            },
            "Save to fleet",
          ),
        ),
      ),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "8%", bottom: "12%" },
        initial: reduce ? false : { opacity: 0, x: 40 },
        whileInView: { opacity: 1, x: 0 },
        viewport: { once: true },
        transition: { delay: 0.35, type: "spring", stiffness: 220 },
      },
      e(
        "div",
        {
          style: {
            padding: "16px 20px",
            borderRadius: 14,
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(167,139,250,0.45)",
            fontWeight: 800,
            color: "#e0e7ff",
            fontSize: 14,
          },
        },
        "✓ Bike appears in catalog",
        e("div", { style: { fontSize: 11, color: "#a1a1aa", marginTop: 8, fontWeight: 600 } }, "Ready for IoT pairing"),
      ),
    ),
  );
}

function ArtAdminA3DeviceLink() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300, position: "relative" } },
    e(
      motion.div,
      { style: { position: "absolute", left: "8%", top: "18%" }, initial: reduce ? false : { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true } },
      e(
        "div",
        {
          style: {
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "linear-gradient(145deg,#312e81,#4c1d95)",
            border: `3px solid ${ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: "0 12px 28px rgba(99,102,241,0.45)",
          },
        },
        "📡",
      ),
      e("div", { style: { marginTop: 10, fontSize: 11, fontWeight: 800, color: "#a5b4fc", textAlign: "center" } }, "GPS module"),
    ),
    e(
      motion.div,
      {
        style: { position: "absolute", right: "10%", bottom: "16%", transform: "scale(0.85)" },
        initial: reduce ? false : { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true },
        transition: { delay: 0.2 },
      },
      e(CharBikeSide, { unlocked: false }),
    ),
    e(
      motion.div,
      {
        style: {
          position: "absolute",
          left: "22%",
          top: "42%",
          width: "56%",
          height: 4,
          borderRadius: 4,
          background: "linear-gradient(90deg,transparent,rgba(129,140,248,0.6),transparent)",
          transformOrigin: "left center",
        },
        initial: reduce ? false : { scaleX: 0, opacity: 0 },
        whileInView: { scaleX: 1, opacity: 1 },
        viewport: { once: true },
        transition: { delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] },
      },
    ),
    e(
      motion.div,
      {
        style: {
          position: "absolute",
          left: "18%",
          top: "36%",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: ADMIN_LINE,
          border: `3px solid ${ink}`,
          boxShadow: "0 0 20px rgba(129,140,248,0.8)",
        },
        animate: reduce ? {} : { left: ["18%", "62%", "62%"], top: ["36%", "44%", "44%"], scale: [1, 1.15, 1] },
        transition: { duration: 2.4, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" },
      },
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { left: "50%", bottom: "6%", transform: "translateX(-50%)", width: "min(92%, 380px)" },
        initial: reduce ? false : { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { delay: 0.5 },
      },
      e(
        "div",
        {
          style: {
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            fontWeight: 700,
            color: "#c4b5fd",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(10,10,12,0.92)",
            border: "1px solid rgba(129,140,248,0.4)",
            textAlign: "center",
          },
        },
        "vehicle_uuid ",
        e("span", { style: { color: "#fff" } }, "bb-iot-7f3a9c"),
      ),
    ),
  );
}

function ArtAdminA5Pricing() {
  const reduce = useReducedMotion();
  const plans = [
    { name: "Lite", price: "₹999", active: false },
    { name: "Pro", price: "₹2,999", active: true },
    { name: "Fleet+", price: "Custom", active: false },
  ];
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    e(
      "div",
      { style: { display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", alignItems: "stretch", padding: "8px 4px" } },
      plans.map((p, i) =>
        e(
          motion.div,
          {
            key: p.name,
            initial: reduce ? false : { opacity: 0, y: 24 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { delay: 0.08 + i * 0.1 },
            style: {
              flex: "1 1 140px",
              maxWidth: 180,
              borderRadius: 14,
              padding: "18px 16px",
              border: p.active ? `2px solid ${ADMIN_LINE}` : "1px solid #333",
              background: p.active ? "rgba(99,102,241,0.14)" : "#141416",
              boxShadow: p.active ? "0 0 32px rgba(129,140,248,0.25)" : "none",
              position: "relative",
            },
          },
          p.active
            ? e(
                "div",
                {
                  style: {
                    position: "absolute",
                    top: -10,
                    right: 12,
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: ADMIN_LINE,
                    color: ink,
                    border: `2px solid ${ink}`,
                  },
                },
                "Active",
              )
            : null,
          e("div", { style: { fontWeight: 900, color: "#fff", fontSize: 16 } }, p.name),
          e("div", { style: { marginTop: 10, fontSize: 22, fontWeight: 900, color: "#e0e7ff" } }, p.price),
          e("div", { style: { marginTop: 8, fontSize: 11, color: "#71717a", fontWeight: 600 } }, "Shown in app checkout"),
        ),
      ),
    ),
  );
}

function ArtAdminA6BikeLive() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    e(
      motion.div,
      {
        style: {
          margin: "0 auto",
          maxWidth: 360,
          borderRadius: 16,
          border: `3px solid ${ink}`,
          background: "#121214",
          padding: "22px 20px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        },
        initial: reduce ? false : { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } },
        e("div", { style: { fontWeight: 900, color: "#fff", fontSize: 15 } }, "BB-204 · EV scooter"),
        e(
          motion.div,
          {
            style: {
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 900,
              textTransform: "uppercase",
              border: `2px solid ${ink}`,
              background: "#22c55e",
              color: "#052e16",
            },
            animate: reduce ? {} : { opacity: [0.75, 1, 0.75], scale: [1, 1.04, 1] },
            transition: { duration: 1.8, repeat: Infinity },
          },
          "Active",
        ),
      ),
      e(
        motion.div,
        {
          style: { fontSize: 11, fontWeight: 700, color: "#71717a", marginBottom: 14 },
          initial: reduce ? false : { opacity: 0 },
          whileInView: { opacity: 1 },
          viewport: { once: true },
          transition: { delay: 0.4 },
        },
        "Was inactive → flipped when checks passed",
      ),
      e(
        motion.div,
        {
          style: {
            padding: "14px 16px",
            borderRadius: 12,
            background: "linear-gradient(90deg, rgba(34,197,94,0.2), rgba(129,140,248,0.12))",
            border: "1px solid rgba(34,197,94,0.45)",
            fontWeight: 900,
            fontSize: 14,
            color: "#bbf7d0",
            textAlign: "center",
          },
          animate: reduce ? {} : { boxShadow: ["0 0 0 rgba(34,197,94,0)", "0 0 28px rgba(34,197,94,0.35)", "0 0 0 rgba(34,197,94,0)"] },
          transition: { duration: 2.2, repeat: Infinity },
        },
        "Available for booking",
      ),
    ),
  );
}

function ArtAdminA7NewBooking() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 260 } },
    e(
      motion.div,
      {
        style: {
          margin: "0 auto",
          width: "min(92%, 340px)",
          borderRadius: 18,
          border: `3px solid ${ink}`,
          overflow: "hidden",
          boxShadow: "0 28px 56px rgba(0,0,0,0.55)",
        },
        initial: reduce ? false : { opacity: 0, y: 30, rotate: -2 },
        whileInView: { opacity: 1, y: 0, rotate: 0 },
        viewport: { once: true },
        transition: { type: "spring", stiffness: 260, damping: 22 },
      },
      e(
        "div",
        { style: { padding: "14px 18px", background: "linear-gradient(90deg,#4338ca,#7c3aed)", fontWeight: 900, color: "#fff", fontSize: 13 } },
        "Ops notifications",
      ),
      e("div", { style: { padding: 20, background: "#151517" } },
        e(
          motion.div,
          {
            style: {
              padding: "16px 14px",
              borderRadius: 12,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(167,139,250,0.4)",
              display: "flex",
              gap: 12,
              alignItems: "center",
            },
            animate: reduce ? {} : { scale: [1, 1.02, 1] },
            transition: { duration: 2, repeat: Infinity },
          },
          e("div", { style: { fontSize: 28 } }, "🔔"),
          e("div", null,
            e("div", { style: { fontWeight: 900, color: "#fff", fontSize: 15 } }, "New booking received"),
            e("div", { style: { fontSize: 12, color: "#a1a1aa", marginTop: 4 } }, "Renter queued · awaiting payment"),
          ),
        ),
      ),
    ),
  );
}

function ArtAdminA8VerifyPayment() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300 } },
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { margin: "0 auto", width: "min(340px, 94vw)" },
        initial: reduce ? false : { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e(
        "div",
        {
          style: {
            borderRadius: 16,
            overflow: "hidden",
            border: "3px solid rgba(129,140,248,0.35)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.55), 0 0 40px rgba(99,102,241,0.2)",
          },
        },
        e(
          "div",
          { style: { padding: "14px 18px", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", fontWeight: 900, color: "#fff", fontSize: 14 } },
          "Razorpay · server verify",
        ),
        e("div", { style: { background: "#121214", padding: "22px 20px" } },
          e("div", { style: { color: "#9ca3af", fontSize: 12, marginBottom: 8 } }, "payment_id · signature check"),
          e(
            motion.div,
            {
              style: {
                marginTop: 16,
                height: 52,
                borderRadius: 12,
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                border: `3px solid ${ink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontWeight: 900,
                color: "#fff",
              },
              initial: reduce ? false : { scale: 0.94 },
              whileInView: { scale: 1 },
              viewport: { once: true },
              transition: { delay: 0.25, type: "spring", stiffness: 400 },
            },
            e(
              motion.svg,
              { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 3 },
              e(motion.path, {
                d: "M5 13l5 5L20 7",
                initial: reduce ? false : { pathLength: 0 },
                whileInView: { pathLength: 1 },
                viewport: { once: true },
                transition: { delay: 0.45, duration: 0.35 },
              }),
            ),
            "Payment verified",
          ),
        ),
      ),
    ),
  );
}

function ArtAdminA9OpsMonitor({ mapboxToken }) {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 320 } },
    e(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 160px",
          gap: 14,
          alignItems: "stretch",
          maxWidth: 720,
          margin: "0 auto",
        },
      },
      e(
        motion.div,
        {
          style: {
            borderRadius: 14,
            overflow: "hidden",
            border: "2px solid rgba(129,140,248,0.3)",
            minHeight: 220,
          },
          initial: reduce ? false : { opacity: 0, x: -12 },
          whileInView: { opacity: 1, x: 0 },
          viewport: { once: true },
        },
        e("div", { style: { height: 240 } }, e(LiveMapBlock, { token: mapboxToken, variant: "admin", uid: "admin-a9" })),
      ),
      e(
        motion.div,
        {
          style: {
            borderRadius: 14,
            padding: 16,
            background: "rgba(17,17,20,0.95)",
            border: "1px solid rgba(129,140,248,0.25)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          },
          initial: reduce ? false : { opacity: 0, x: 12 },
          whileInView: { opacity: 1, x: 0 },
          viewport: { once: true },
          transition: { delay: 0.12 },
        },
        e("div", { style: { fontWeight: 900, fontSize: 13, color: "#a5b4fc" } }, "Live telemetry"),
        e("div", null,
          e("div", { style: { fontSize: 11, color: "#71717a", fontWeight: 700, marginBottom: 6 } }, "Battery"),
          e(
            "div",
            { style: { height: 10, borderRadius: 999, background: "#27272a", overflow: "hidden", border: `1px solid ${ink}` } },
            e(motion.div, {
              style: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#22c55e,#86efac)" },
              initial: reduce ? false : { width: "0%" },
              whileInView: { width: "87%" },
              viewport: { once: true },
              transition: { duration: 1.2, ease: "easeOut" },
            }),
          ),
          e("div", { style: { fontSize: 12, fontWeight: 800, color: "#fff", marginTop: 6 } }, "87% · healthy"),
        ),
        e("div", null,
          e("div", { style: { fontSize: 11, color: "#71717a", fontWeight: 700, marginBottom: 6 } }, "Route"),
          e("div", { style: { fontSize: 13, fontWeight: 800, color: "#e0e7ff" } }, "Indiranagar → MG Rd"),
        ),
      ),
    ),
  );
}

function ArtAdminA10Earnings() {
  const reduce = useReducedMotion();
  const bars = [42, 58, 48, 72, 65, 88, 76];
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    e(
      motion.svg,
      {
        className: "sw-v-cutout",
        viewBox: "0 0 360 200",
        style: { width: "min(100%, 420px)", height: "auto", display: "block", margin: "0 auto" },
        initial: reduce ? false : { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e("defs", null,
        e("linearGradient", { id: "earn-admin", x1: "0%", y1: "100%", x2: "0%", y2: "0%" },
          e("stop", { offset: "0%", stopColor: "#4338ca" }),
          e("stop", { offset: "100%", stopColor: ADMIN_SOFT }),
        ),
      ),
      e("text", { x: 16, y: 28, fill: "#e0e7ff", fontSize: 14, fontWeight: 900 }, "Earnings trend"),
      bars.map((h, i) => {
        const H = h * 1.4;
        const y = 180 - H;
        return e(motion.rect, {
          key: i,
          x: 40 + i * 38,
          y,
          width: 22,
          height: H,
          rx: 6,
          fill: "url(#earn-admin)",
          stroke: ink,
          strokeWidth: 2,
          initial: reduce ? false : { opacity: 0, y: y + 24 },
          whileInView: { opacity: 1, y },
          viewport: { once: true },
          transition: { delay: 0.05 + i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        });
      }),
    ),
  );
}

/* —— Rider workflow story art (R1–R14) — fleet partner angle —— */

function ArtRiderEarnWithUs() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    e(
      motion.div,
      { initial: reduce ? false : { opacity: 0, x: -20 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true } },
      e(FloatWrap, { delay: 0.15 }, e(CharUser, { uid: "rw1" })),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "5%", top: "12%", width: "min(300px, 90vw)" },
        initial: reduce ? false : { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { delay: 0.12, type: "spring", stiffness: 260, damping: 24 },
      },
      e(
        "div",
        {
          style: {
            borderRadius: 22,
            border: `4px solid ${ink}`,
            background: "#101012",
            overflow: "hidden",
            boxShadow: "0 28px 56px rgba(0,0,0,0.55), 0 0 36px rgba(34,197,94,0.12)",
          },
        },
        e("div", { style: { padding: "18px 16px", fontWeight: 900, color: "#fff", fontSize: 15 } }, BRAND_PRODUCT_NAME),
        e("div", { style: { padding: "10px 16px 22px" } },
          e("div", { style: { color: "#71717a", fontSize: 12, marginBottom: 14 } }, "Already renting? Partner with us."),
          e(
            motion.div,
            {
              style: {
                height: 52,
                borderRadius: 14,
                background: `linear-gradient(135deg,${RIDER_LINE},#15803d)`,
                border: `3px solid ${ink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 16,
                color: "#052e16",
                cursor: "default",
              },
              whileInView: reduce ? {} : { scale: [1, 1.03, 1] },
              transition: { duration: 2.2, repeat: Infinity },
              viewport: { once: false, amount: 0.4 },
            },
            "Earn with us",
          ),
        ),
      ),
    ),
  );
}

function ArtRiderKYCForm() {
  const reduce = useReducedMotion();
  const rows = [
    { label: "Driving license", icon: "🪪" },
    { label: "Aadhaar (masked)", icon: "🆔" },
  ];
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    rows.map((row, i) =>
      e(
        motion.div,
        {
          key: row.label,
          style: {
            maxWidth: 380,
            margin: "0 auto 14px",
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid rgba(74,222,128,0.35)",
            background: "rgba(6,78,59,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          },
          initial: reduce ? false : { opacity: 0, x: -24 },
          whileInView: { opacity: 1, x: 0 },
          viewport: { once: true },
          transition: { delay: 0.08 + i * 0.12 },
        },
        e("div", { style: { fontSize: 28 } }, row.icon),
        e("div", { style: { flex: 1 } },
          e("div", { style: { fontWeight: 800, color: "#ecfdf5", fontSize: 14 } }, row.label),
          e(
            motion.div,
            {
              style: { marginTop: 10, height: 8, borderRadius: 999, background: "#27272a", overflow: "hidden" },
              initial: reduce ? false : { opacity: 0 },
              whileInView: { opacity: 1 },
              viewport: { once: true },
            },
            e(motion.div, {
              style: { height: "100%", borderRadius: 999, background: RIDER_LINE },
              initial: reduce ? false : { width: "0%" },
              whileInView: { width: "100%" },
              viewport: { once: true },
              transition: { duration: 1.1, delay: 0.25 + i * 0.15, ease: "easeOut" },
            }),
          ),
          e("div", { style: { fontSize: 11, color: "#86efac", marginTop: 8, fontWeight: 700 } }, "Encrypted upload · OCR queued"),
        ),
      ),
    ),
  );
}

function ArtRiderAdminApprove() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280, position: "relative" } },
    e(
      motion.div,
      { style: { position: "absolute", left: "5%", top: "10%" }, initial: reduce ? false : { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true } },
      e(FloatWrap, { delay: 0.3 }, e(CharAdmin, { uid: "rv3", style: { transform: "scale(0.92)" } })),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "6%", top: "18%", width: "min(340px, 92vw)" },
        initial: reduce ? false : { opacity: 0, scale: 0.94 },
        whileInView: { opacity: 1, scale: 1 },
        viewport: { once: true },
        transition: { type: "spring", stiffness: 280 },
      },
      e(
        "div",
        {
          style: {
            borderRadius: 14,
            border: `3px solid ${ink}`,
            background: "#13131a",
            padding: 18,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          },
        },
        e("div", { style: { fontWeight: 900, color: "#e0e7ff", marginBottom: 14 } }, "Partner applications"),
        e(
          motion.div,
          {
            style: {
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(234,179,8,0.15)",
              border: "1px solid rgba(250,204,21,0.45)",
              fontWeight: 800,
              color: "#fef08a",
              marginBottom: 12,
            },
            animate: reduce ? {} : { opacity: [1, 0.35, 1] },
            transition: { duration: 1.6, repeat: 2 },
          },
          "Pending · risk checks",
        ),
        e(
          motion.div,
          {
            style: {
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(34,197,94,0.18)",
              border: "2px solid rgba(74,222,128,0.55)",
              fontWeight: 900,
              color: "#bbf7d0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            },
            initial: reduce ? false : { opacity: 0, y: 16 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { delay: 0.85, type: "spring", stiffness: 320 },
          },
          e(
            motion.span,
            { style: { fontSize: 22 } },
            "✓",
          ),
          "Approved · fleet eligible",
        ),
      ),
    ),
  );
}

function ArtRiderActivatedDash() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300 } },
    e(
      motion.div,
      { initial: reduce ? false : { opacity: 0, x: -18 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true } },
      e(FloatWrap, { delay: 0.2 }, e(CharRider, { uid: "rw4" })),
    ),
    e(
      motion.div,
      {
        className: "sw-v-float",
        style: { right: "4%", top: "10%", width: "min(380px, 94vw)" },
        initial: reduce ? false : { opacity: 0, y: -12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e(
        "div",
        {
          style: {
            borderRadius: 16,
            border: `3px solid ${ink}`,
            background: "linear-gradient(165deg, rgba(22,163,74,0.12), #121214)",
            overflow: "hidden",
          },
        },
        e(
          "div",
          { style: { padding: "12px 16px", background: "#14532d", fontWeight: 900, color: "#ecfdf5", fontSize: 13 } },
          "Rider dashboard",
        ),
        e("div", { style: { padding: "18px 16px 20px" } },
          e(
            motion.div,
            {
              style: {
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(34,197,94,0.2)",
                border: "2px solid rgba(74,222,128,0.5)",
                fontWeight: 900,
                fontSize: 15,
                color: "#fff",
                textAlign: "center",
              },
              initial: reduce ? false : { scale: 0.92 },
              whileInView: { scale: 1 },
              viewport: { once: true },
              transition: { type: "spring", stiffness: 380 },
            },
            "You are now a Delivery Partner",
          ),
          e("div", { style: { marginTop: 14, fontSize: 12, color: "#a1a1aa", fontWeight: 600 } }, `Fleet jobs · ${BRAND_PRODUCT_NAME} hubs · same login`),
        ),
      ),
    ),
  );
}

function ArtRiderGoOnline({ mapboxToken }) {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 320 } },
    e(
      motion.div,
      {
        style: {
          maxWidth: 420,
          margin: "0 auto 14px",
          padding: "16px 18px",
          borderRadius: 14,
          border: "1px solid rgba(74,222,128,0.35)",
          background: "#141416",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        },
        initial: reduce ? false : { opacity: 0, y: -10 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e("div", null,
        e("div", { style: { fontWeight: 900, color: "#fff", fontSize: 15 } }, "Shift status"),
        e("div", { style: { fontSize: 12, color: "#71717a", marginTop: 4 } }, "Offline → Online accepts jobs"),
      ),
      e(
        motion.div,
        {
          style: {
            width: 56,
            height: 30,
            borderRadius: 999,
            background: "#27272a",
            border: `3px solid ${ink}`,
            position: "relative",
          },
        },
        e(motion.div, {
          style: {
            position: "absolute",
            top: 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#525252",
            border: `2px solid ${ink}`,
          },
          animate: reduce ? { left: 4 } : { left: [4, 26, 26], background: ["#525252", RIDER_LINE, RIDER_LINE] },
          transition: { duration: 1.6, repeat: Infinity, repeatDelay: 1 },
        }),
      ),
    ),
    e(
      motion.div,
      {
        style: {
          maxWidth: 520,
          margin: "0 auto",
          height: 220,
          borderRadius: 14,
          overflow: "hidden",
          border: "2px solid rgba(34,197,94,0.35)",
          opacity: reduce ? 1 : undefined,
        },
        initial: reduce ? false : { opacity: 0.5 },
        whileInView: { opacity: 1 },
        viewport: { once: true },
        transition: { delay: 0.35 },
      },
      e(LiveMapBlock, { token: mapboxToken, variant: "rider", uid: "rider-r5" }),
    ),
  );
}

function ArtRiderIncomingOrder() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 300, position: "relative", overflow: "hidden" } },
    e(
      motion.div,
      {
        style: {
          position: "absolute",
          bottom: 0,
          left: "50%",
          width: "min(380px, 96vw)",
          transform: "translateX(-50%)",
          borderRadius: "18px 18px 0 0",
          border: "2px solid rgba(74,222,128,0.45)",
          borderBottom: "none",
          background: "#121214",
          boxShadow: "0 -20px 48px rgba(0,0,0,0.55)",
          padding: "18px 18px 22px",
        },
        initial: reduce ? false : { y: "100%" },
        whileInView: { y: 0 },
        viewport: { once: true },
        transition: { type: "spring", stiffness: 260, damping: 26 },
      },
      e("div", { style: { width: 44, height: 5, borderRadius: 999, background: "#3f3f46", margin: "0 auto 14px" } }),
      e("div", { style: { fontWeight: 900, color: "#fff", fontSize: 16 } }, "Fleet job · BB-Hub Koramangala"),
      e("div", { style: { fontSize: 12, color: "#a1a1aa", marginTop: 8 } }, "Relocate charged EV → subscriber pin · ETA 18 min"),
      e("div", { style: { display: "flex", gap: 10, marginTop: 14 } },
        e("div", { style: { flex: 1, padding: "10px 12px", borderRadius: 10, background: "#1c1c1f", fontSize: 12, fontWeight: 700, color: "#d4d4d8" } }, "₹120 · 6.4 km"),
        e("div", { style: { flex: 1, padding: "10px 12px", borderRadius: 10, background: "#1c1c1f", fontSize: 12, fontWeight: 700, color: "#d4d4d8" } }, "Vehicle BB-089"),
      ),
    ),
  );
}

function ArtRiderAcceptRoute() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 280 } },
    e(
      motion.div,
      {
        style: {
          margin: "0 auto",
          maxWidth: 360,
          padding: "18px 16px",
          borderRadius: 16,
          border: `3px solid ${ink}`,
          background: "#141416",
        },
        initial: reduce ? false : { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e(
        motion.div,
        {
          style: {
            height: 48,
            borderRadius: 12,
            background: RIDER_LINE,
            border: `3px solid ${ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 15,
            color: ink,
            marginBottom: 18,
          },
          whileTap: reduce ? {} : { scale: 0.97 },
          whileInView: reduce ? {} : { boxShadow: ["0 0 0 rgba(34,197,94,0)", "0 0 28px rgba(34,197,94,0.45)", "0 0 0 rgba(34,197,94,0)"] },
          transition: { boxShadow: { duration: 1.8, repeat: Infinity } },
          viewport: { once: false, amount: 0.5 },
        },
        "Accept job",
      ),
      e(
        "svg",
        { viewBox: "0 0 400 120", width: "100%", height: 110 },
        e(
          motion.path,
          {
            d: "M 20 90 Q 120 20 200 70 T 380 40",
            fill: "none",
            stroke: RIDER_LINE,
            strokeWidth: 5,
            strokeLinecap: "round",
            initial: reduce ? false : { pathLength: 0 },
            whileInView: { pathLength: 1 },
            viewport: { once: true },
            transition: { duration: 1.1, ease: "easeInOut", delay: 0.2 },
          },
        ),
        e("circle", { cx: 20, cy: 90, r: 10, fill: "#22c55e", stroke: ink, strokeWidth: 3 }),
        e("circle", { cx: 380, cy: 40, r: 10, fill: "#86efac", stroke: ink, strokeWidth: 3 }),
      ),
      e("div", { style: { textAlign: "center", fontSize: 12, fontWeight: 700, color: "#86efac", marginTop: 8 } }, "Navigation route armed"),
    ),
  );
}

function ArtRiderPickupConfirm() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 240 } },
    e(
      motion.div,
      {
        style: {
          margin: "0 auto",
          maxWidth: 340,
          padding: "22px 18px",
          borderRadius: 16,
          border: `3px solid ${ink}`,
          background: "linear-gradient(180deg, rgba(22,163,74,0.15), #121212)",
          textAlign: "center",
        },
        initial: reduce ? false : { opacity: 0, scale: 0.94 },
        whileInView: { opacity: 1, scale: 1 },
        viewport: { once: true },
      },
      e("div", { style: { fontSize: 13, color: "#86efac", fontWeight: 800, marginBottom: 10 } }, `At ${BRAND_PRODUCT_NAME} hub`),
      e(
        motion.button,
        {
          type: "button",
          style: {
            width: "100%",
            padding: "16px 18px",
            borderRadius: 14,
            border: `3px solid ${ink}`,
            background: RIDER_LINE,
            fontWeight: 900,
            fontSize: 16,
            color: ink,
            cursor: "default",
          },
          whileTap: reduce ? {} : { scale: 0.98 },
        },
        "Confirm pickup · BB-089",
      ),
      e(
        motion.div,
        {
          style: { marginTop: 14, fontSize: 12, fontWeight: 700, color: "#a1a1aa" },
          initial: reduce ? false : { opacity: 0 },
          whileInView: { opacity: 1 },
          viewport: { once: true },
          transition: { delay: 0.5 },
        },
        "Status → In transit to subscriber",
      ),
    ),
  );
}

function ArtRiderDropSlide() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 260 } },
    e(
      motion.div,
      {
        style: {
          margin: "0 auto",
          maxWidth: 360,
          padding: "20px 18px",
          borderRadius: 16,
          border: "2px solid rgba(74,222,128,0.4)",
          background: "#13131a",
        },
        initial: reduce ? false : { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e("div", { style: { fontWeight: 900, color: "#fff", marginBottom: 16 } }, "Slide to complete delivery"),
      e(
        "div",
        {
          style: {
            position: "relative",
            height: 52,
            borderRadius: 999,
            background: "#27272a",
            border: `3px solid ${ink}`,
            overflow: "hidden",
          },
        },
        e(
          motion.div,
          {
            style: {
              position: "absolute",
              left: 6,
              top: 6,
              width: 120,
              height: 40,
              borderRadius: 999,
              background: `linear-gradient(90deg,${RIDER_LINE},#15803d)`,
              border: `2px solid ${ink}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 12,
              color: ink,
            },
            animate: reduce ? { left: 6 } : { left: [6, 220, 220] },
            transition: { duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" },
          },
          "Slide →",
        ),
        e(
          "div",
          {
            style: {
              position: "absolute",
              right: 18,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              fontWeight: 800,
              color: "#71717a",
            },
          },
          "Done",
        ),
      ),
    ),
  );
}

function ArtRiderEarningsCountUp() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (reduce) setN(428);
  }, [reduce]);
  useEffect(() => {
    if (reduce || !run) return undefined;
    let start;
    let id;
    const target = 428;
    const dur = 1900;
    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(target * eased));
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [run, reduce]);

  return e(
    motion.div,
    {
      className: "sw-v-stage",
      style: { minHeight: 260 },
      onViewportEnter: () => setRun(true),
      viewport: { once: true, amount: 0.35 },
    },
    e(
      "div",
      {
        style: {
          margin: "0 auto",
          maxWidth: 380,
          padding: "28px 22px",
          borderRadius: 18,
          border: `3px solid ${ink}`,
          background: "linear-gradient(145deg, rgba(22,163,74,0.2), #101012)",
          textAlign: "center",
        },
      },
      e("div", { style: { fontSize: 13, fontWeight: 800, color: "#86efac", marginBottom: 8 } }, "Today’s fleet payout"),
      e(
        motion.div,
        {
          style: { fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" },
          key: n,
          initial: reduce ? false : { opacity: 0.6, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.15 },
        },
        "₹",
        n,
      ),
      e("div", { style: { fontSize: 12, color: "#a1a1aa", marginTop: 12, fontWeight: 600 } }, "Tips + distance bonus · settles nightly"),
    ),
  );
}

function ArtRiderStatsPanel() {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 240 } },
    e(
      motion.div,
      {
        style: {
          margin: "0 auto",
          maxWidth: 400,
          padding: "22px 20px",
          borderRadius: 16,
          border: "1px solid rgba(74,222,128,0.35)",
          background: "#121214",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        },
        initial: reduce ? false : { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e("div", null,
        e("div", { style: { fontSize: 11, fontWeight: 800, color: "#71717a", textTransform: "uppercase" } }, "Partner rating"),
        e("div", { style: { marginTop: 10, fontSize: 28, fontWeight: 900, color: "#fff" } }, "4.92"),
        e("div", { style: { marginTop: 8, fontSize: 18 } }, "★★★★★"),
      ),
      e("div", null,
        e("div", { style: { fontSize: 11, fontWeight: 800, color: "#71717a", textTransform: "uppercase" } }, "Jobs done"),
        e(
          motion.div,
          {
            style: { marginTop: 10, fontSize: 28, fontWeight: 900, color: RIDER_SOFT },
            initial: reduce ? false : { opacity: 0 },
            whileInView: { opacity: 1 },
            viewport: { once: true },
            transition: { delay: 0.25 },
          },
          "312",
        ),
        e("div", { style: { marginTop: 8, fontSize: 12, color: "#a1a1aa", fontWeight: 600 } }, `Lifetime ${BRAND_PRODUCT_NAME} fleet`),
      ),
    ),
  );
}

function ArtRiderAdminMonitorCapsule({ mapboxToken }) {
  const reduce = useReducedMotion();
  return e(
    "div",
    { className: "sw-v-stage", style: { minHeight: 320 } },
    e(
      motion.div,
      { style: { marginBottom: 14 }, initial: reduce ? false : { opacity: 0, x: -12 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true } },
      e(FloatWrap, { delay: 0.2 }, e(CharAdmin, { uid: "r14", style: { transform: "scale(0.88)" } })),
    ),
    e(
      motion.div,
      {
        style: {
          marginLeft: "auto",
          maxWidth: 520,
          borderRadius: 16,
          border: `3px solid ${ink}`,
          overflow: "hidden",
          background: "#141416",
          boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
        },
        initial: reduce ? false : { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
      },
      e(
        "div",
        { style: { padding: "12px 16px", background: "linear-gradient(90deg,#312e81,#14532d)", fontWeight: 900, color: "#fff", fontSize: 13 } },
        "Ops · Riders & routes",
      ),
      e("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16 } },
        e("div", null,
          e("div", { style: { fontSize: 11, color: "#a5b4fc", fontWeight: 800, marginBottom: 8 } }, "Active partners"),
          e("div", { style: { fontSize: 26, fontWeight: 900, color: "#fff" } }, "86"),
          e("div", { style: { fontSize: 11, color: "#86efac", marginTop: 8, fontWeight: 700 } }, "Live routes · 24"),
        ),
        e("div", null,
          e("div", { style: { fontSize: 11, color: "#a5b4fc", fontWeight: 800, marginBottom: 8 } }, "Shift earnings pool"),
          e("div", { style: { fontSize: 26, fontWeight: 900, color: "#c4b5fd" } }, "₹2.1L"),
          e("div", { style: { fontSize: 11, color: "#a1a1aa", marginTop: 8, fontWeight: 700 } }, "Synced from rider wallet API"),
        ),
      ),
      e("div", { style: { height: 200, borderTop: "1px solid rgba(129,140,248,0.2)" } }, e(LiveMapBlock, { token: mapboxToken, variant: "admin", uid: "admin-r14-rider" })),
    ),
  );
}

function FallbackMapVisual({ accent = "#ff6a00", uid = "map" }) {
  const reduce = useReducedMotion();
  const gid = (s) => `${s}-${uid}`;
  return e(
    "svg",
    {
      viewBox: "0 0 1200 520",
      width: "100%",
      height: "100%",
      preserveAspectRatio: "xMidYMid slice",
      style: { display: "block", background: "#0a0a0a" },
    },
    e("defs", null,
      e("pattern", { id: gid("grid"), width: 32, height: 32, patternUnits: "userSpaceOnUse" },
        e("path", { d: "M32 0 H0 V32", fill: "none", stroke: "#1a1a1a", strokeWidth: 1 }),
      ),
      e("linearGradient", { id: gid("route"), x1: "0%", y1: "100%", x2: "100%", y2: "0%" },
        e("stop", { offset: "0%", stopColor: accent, stopOpacity: 0.2 }),
        e("stop", { offset: "100%", stopColor: accent, stopOpacity: 1 }),
      ),
    ),
    e("rect", { width: "100%", height: "100%", fill: `url(#${gid("grid")})` }),
    e(
      motion.path,
      {
        d: "M 80 400 Q 320 120 520 260 T 980 140 L 1120 180",
        fill: "none",
        stroke: `url(#${gid("route")})`,
        strokeWidth: 6,
        strokeLinecap: "round",
        strokeDasharray: 640,
        initial: reduce ? false : { strokeDashoffset: 640 },
        whileInView: { strokeDashoffset: 0 },
        viewport: { once: false, amount: 0.25 },
        transition: { duration: 2.4, ease: "easeInOut" },
      },
    ),
    e("circle", { cx: 80, cy: 400, r: 14, fill: "#22c55e", stroke: ink, strokeWidth: 4 }),
    e("circle", { cx: 1120, cy: 180, r: 14, fill: accent, stroke: ink, strokeWidth: 4 }),
    e(
      motion.circle,
      {
        cx: 80,
        cy: 400,
        r: 16,
        fill: "#fff",
        stroke: accent,
        strokeWidth: 5,
        animate: reduce
          ? {}
          : {
              cx: [80, 280, 520, 760, 980, 1120],
              cy: [400, 200, 260, 180, 160, 180],
            },
        transition: { duration: 8, repeat: Infinity, ease: "linear", repeatDelay: 0.8 },
      },
    ),
    e(
      "text",
      { x: 600, y: 48, textAnchor: "middle", fill: "#525252", fontSize: 14, fontWeight: 700 },
      "Add MAPBOX_ACCESS_TOKEN in .env for real Mapbox map",
    ),
  );
}

function LiveMapBlock({ token, variant = "user", uid = "map-default" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const timerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();
  const lineColor =
    variant === "admin" ? ADMIN_LINE : variant === "rider" ? RIDER_LINE : "#ff6a00";
  const accent = lineColor;
  const srcId = `workflow-route-${uid}`;
  const layerId = `workflow-route-line-${uid}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || reduce) return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setReady(true);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  useEffect(() => {
    if (!ready || !token || typeof window.mapboxgl === "undefined") return undefined;
    const mapboxgl = window.mapboxgl;
    mapboxgl.accessToken = token;
    const routeCoords = [
      [77.081, 28.612],
      [77.095, 28.628],
      [77.112, 28.638],
      [77.128, 28.652],
      [77.145, 28.664],
      [77.158, 28.675],
    ];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: routeCoords[0],
      zoom: 11.2,
      attributionControl: true,
    });
    mapRef.current = map;

    const interpolateLine = (coords, steps) => {
      const out = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const [x0, y0] = coords[i];
        const [x1, y1] = coords[i + 1];
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
        }
      }
      out.push(coords[coords.length - 1]);
      return out;
    };
    const smoothPath = interpolateLine(routeCoords, 16);

    map.on("load", () => {
      map.addSource(srcId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: routeCoords },
        },
      });
      map.addLayer({
        id: layerId,
        type: "line",
        source: srcId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": lineColor, "line-width": 5, "line-opacity": 0.92 },
      });

      const markerEl = document.createElement("div");
      markerEl.style.width = "28px";
      markerEl.style.height = "28px";
      markerEl.style.borderRadius = "50%";
      markerEl.style.background = lineColor;
      markerEl.style.border = "4px solid #111";
      markerEl.style.boxShadow =
        variant === "admin"
          ? "0 4px 14px rgba(129,140,248,0.55)"
          : variant === "rider"
            ? "0 4px 14px rgba(34,197,94,0.55)"
            : "0 4px 14px rgba(255,106,0,0.5)";
      const marker = new mapboxgl.Marker({ element: markerEl }).setLngLat(smoothPath[0]).addTo(map);
      markerRef.current = marker;

      let idx = 0;
      timerRef.current = window.setInterval(() => {
        idx = (idx + 1) % smoothPath.length;
        marker.setLngLat(smoothPath[idx]);
      }, 320);

      const bounds = new mapboxgl.LngLatBounds();
      routeCoords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 72, duration: 1200 });
    });

    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (timerRef.current) window.clearInterval(timerRef.current);
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [ready, token, reduce, srcId, layerId, lineColor, variant]);

  const useReal = Boolean(token && typeof window !== "undefined" && window.mapboxgl);
  const shell =
    (useReal ? "sw-v-map-shell" : "sw-v-map-fallback") +
    (variant === "admin" ? " sw-v-map--admin" : "") +
    (variant === "rider" ? " sw-v-map--rider" : "");

  return e(
    "div",
    { className: shell, ref: containerRef },
    useReal && ready ? null : e(FallbackMapVisual, { accent, uid }),
  );
}

function SceneSection({ step, title, tagline, flowAction, flowResult, copy, children, variant = "user" }) {
  const reduce = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1];
  const sceneClass =
    "sw-v-scene" +
    (variant === "admin" ? " sw-v-scene--admin" : "") +
    (variant === "rider" ? " sw-v-scene--rider" : "");
  return e(
    motion.section,
    {
      className: sceneClass,
      initial: reduce ? false : { opacity: 0.35, y: 24 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.22, margin: "-60px 0px" },
      transition: { duration: 0.55, ease },
    },
    e(
      "div",
      { className: "sw-v-scene-inner sw-v-split" },
      e(
        motion.div,
        {
          initial: reduce ? false : { opacity: 0, y: 40, x: -18 },
          whileInView: { opacity: 1, y: 0, x: 0 },
          viewport: { once: true, amount: 0.35, margin: "-40px 0px" },
          transition: { duration: 0.65, ease, delay: 0.04 },
        },
        e("span", { className: "sw-v-label" }, step),
        e("h2", { className: "sw-v-scene-title" }, title),
        tagline ? e("p", { className: "sw-v-scene-tagline" }, tagline) : null,
        flowAction && flowResult
          ? e(
              "div",
              { className: "sw-v-flow-row" },
              e("span", { className: "sw-v-flow-pill sw-v-flow-pill--action" }, flowAction),
              e("span", { className: "sw-v-flow-arrow", "aria-hidden": true }, "→"),
              e("span", { className: "sw-v-flow-pill sw-v-flow-pill--result" }, flowResult),
            )
          : null,
        e("p", { className: "sw-v-scene-copy" }, copy),
      ),
      e(
        motion.div,
        {
          initial: reduce ? false : { opacity: 0, y: 44, x: 16 },
          whileInView: { opacity: 1, y: 0, x: 0 },
          viewport: { once: true, amount: 0.22, margin: "-40px 0px" },
          transition: { duration: 0.68, delay: 0.1, ease },
        },
        children,
      ),
    ),
  );
}

function MapSceneSection({
  mapboxToken,
  variant = "user",
  step,
  title,
  tagline,
  flowAction,
  flowResult,
  copy,
  uid = "map-scene",
}) {
  const reduce = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1];
  const sceneClass =
    "sw-v-scene sw-v-scene--map" +
    (variant === "admin" ? " sw-v-scene--admin" : "") +
    (variant === "rider" ? " sw-v-scene--rider" : "");
  return e(
    motion.section,
    {
      className: sceneClass,
      initial: reduce ? false : { opacity: 0.35, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.15, margin: "-50px 0px" },
      transition: { duration: 0.55, ease },
    },
    e(
      "div",
      { className: "sw-v-scene-inner", style: { display: "block", maxWidth: 760 } },
      e(
        motion.div,
        {
          initial: reduce ? false : { opacity: 0, y: 36, x: -12 },
          whileInView: { opacity: 1, y: 0, x: 0 },
          viewport: { once: true, amount: 0.35 },
          transition: { duration: 0.62, ease },
        },
        e("span", { className: "sw-v-label" }, step),
        e("h2", { className: "sw-v-scene-title" }, title),
        e("p", { className: "sw-v-scene-tagline" }, tagline),
        e(
          "div",
          { className: "sw-v-flow-row" },
          e("span", { className: "sw-v-flow-pill sw-v-flow-pill--action" }, flowAction),
          e("span", { className: "sw-v-flow-arrow", "aria-hidden": true }, "→"),
          e("span", { className: "sw-v-flow-pill sw-v-flow-pill--result" }, flowResult),
        ),
        e("p", { className: "sw-v-scene-copy" }, copy),
      ),
    ),
    e(
      "div",
      { className: "sw-v-map-bleed" },
      e(LiveMapBlock, { token: mapboxToken, variant, uid }),
    ),
  );
}

const FLOW_HINTS = {
  user: `Orange renter journey: book ${BRAND_PRODUCT_NAME} → pay → unlock → GPS peace of mind.`,
  rider:
    "Green partner ladder: earn CTA → KYC → admin approve → online → hub jobs → navigate → payout → stats.",
  admin: "Blue ops spine: fleet + IoT + pricing + monitoring — includes rider oversight at story end.",
};

function FlowModeToggle({ mode, onChange }) {
  return e(
    "div",
    { className: "sw-v-flow-toggle-wrap" },
    e(
      "div",
      { className: "sw-v-flow-toggle", role: "tablist", "aria-label": "Workflow story mode" },
      e(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": mode === "user",
          className: "sw-v-flow-toggle-btn is-user" + (mode === "user" ? " is-active" : ""),
          onClick: () => onChange("user"),
        },
        "User flow",
      ),
      e(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": mode === "rider",
          className: "sw-v-flow-toggle-btn is-rider" + (mode === "rider" ? " is-active" : ""),
          onClick: () => onChange("rider"),
        },
        "Rider flow",
      ),
      e(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": mode === "admin",
          className: "sw-v-flow-toggle-btn is-admin" + (mode === "admin" ? " is-active" : ""),
          onClick: () => onChange("admin"),
        },
        "Admin flow",
      ),
    ),
    e("p", { className: "sw-v-flow-toggle-hint" }, FLOW_HINTS[mode]),
  );
}

function UserStoryBlocks(mapboxToken) {
  return [
    e(FlowBridge, { key: "ub1", text: "Scene 1 · User books" }),
    e(
      SceneSection,
      {
        key: "us1",
        step: "Scene 1",
        title: "User taps subscribe",
        tagline: `Everything begins when someone picks a plan in the ${BRAND_PRODUCT_NAME} app.`,
        flowAction: "Tap Subscribe ₹2999",
        flowResult: "Booking request sent to server",
        copy: "The app packages what they chose and opens the door for payment — still safe, still reversible until pay succeeds.",
      },
      e(ArtBooking),
    ),
    e(FlowBridge, { key: "ub2", text: "Scene 2 · Backend" }),
    e(
      SceneSection,
      {
        key: "us2",
        step: "Scene 2",
        title: "Backend & API",
        tagline: "Your Node server is the gatekeeper: it checks input and prepares Razorpay.",
        flowAction: "HTTPS request arrives",
        flowResult: "Validated order draft + Razorpay order id",
        copy: "Middleware and validators run first; only clean payloads become rows and payment intents.",
      },
      e(ArtBackend),
    ),
    e(FlowBridge, { key: "ub3", text: "Scene 3 · Razorpay" }),
    e(
      SceneSection,
      {
        key: "us3",
        step: "Scene 3",
        title: "Razorpay checkout",
        tagline: `Money is collected by Razorpay — ${BRAND_PRODUCT_NAME} never stores card or UPI PINs.`,
        flowAction: "Customer completes pay",
        flowResult: "Signed receipt → verify on server",
        copy: "Success isn’t guessed: the app sends proof back; the API verifies the signature before trusting “paid”.",
      },
      e(ArtRazorpay),
    ),
    e(FlowBridge, { key: "ub4", text: "Scene 4 · Database" }),
    e(
      SceneSection,
      {
        key: "us4",
        step: "Scene 4",
        title: "Saved in Supabase",
        tagline: "One database row ties the human, the bike slot, and the payment together.",
        flowAction: "Verified payment",
        flowResult: "Orders + payments updated",
        copy: "Supabase Postgres is the single source of truth for dashboards, unlock logic, and history.",
      },
      e(ArtDatabase),
    ),
    e(FlowBridge, { key: "ub5", text: "Scene 5 · Admin" }),
    e(
      SceneSection,
      {
        key: "us5",
        step: "Scene 5",
        title: "Admin notification",
        tagline: "Ops sees new paid rentals immediately — no spreadsheet chasing.",
        flowAction: "Paid row appears",
        flowResult: "Dashboard toast + monitoring",
        copy: "Teams confirm fleet health, spot failures early, and trust the same data the unlock API will read.",
      },
      e(ArtAdminDash),
    ),
    e(FlowBridge, { key: "ub6", text: "Scene 6 · Unlock" }),
    e(
      SceneSection,
      {
        key: "us6",
        step: "Scene 6",
        title: "Bike unlock",
        tagline: "Paid → unlock: the app asks the server “is this renter cleared?” before the motor frees.",
        flowAction: "Tap Unlock Bike",
        flowResult: "Ride Started + IoT unlock (if linked)",
        copy: "Try the button: the API re-checks payment, moves the order to ongoing, updates Supabase, and calls the IoT shim when a bike_id exists.",
      },
      e(ArtBikeUnlock),
    ),
    e(FlowBridge, { key: "ub7", text: "Scene 7 · Live map" }),
    e(MapSceneSection, {
      key: "mapu",
      mapboxToken,
      variant: "user",
      step: "Scene 7",
      title: "Live tracking",
      tagline: "See where the bike is during the rental — peace of mind for you and ops.",
      flowAction: "GPS / trips update",
      flowResult: "Route + bike dot on map",
      copy:
        "With MAPBOX_ACCESS_TOKEN you get a real dark map and orange path. Without it, the same story plays as a full-width animated preview. Trusted renters can later open the green Rider flow — same platform.",
      uid: "user-live",
    }),
    e(FlowBridge, { key: "ubend", text: "End · Renter story" }),
  ];
}

function RiderStoryBlocks(mapboxToken) {
  return [
    e(FlowBridge, { key: "rb1", text: "R1 · Partner entry", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs1",
        variant: "rider",
        step: "R1",
        title: "Become a delivery partner",
        tagline: `Renters can graduate into fleet ops — same ${BRAND_PRODUCT_NAME} app, new earning mode.`,
        flowAction: 'Tap “Earn with us”',
        flowResult: "Partner application started",
        copy: "No separate gimmick app: trusted renters unlock partner flows after eligibility checks.",
      },
      e(ArtRiderEarnWithUs),
    ),
    e(FlowBridge, { key: "rb2", text: "R2 · KYC", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs2",
        variant: "rider",
        step: "R2",
        title: "Application & KYC",
        tagline: "Upload license + Aadhaar — encrypted, scanned, auditable.",
        flowAction: "Attach documents",
        flowResult: "Verification queue",
        copy: "Mirrors production onboarding: files hit object storage + worker OCR before an admin ever clicks approve.",
      },
      e(ArtRiderKYCForm),
    ),
    e(FlowBridge, { key: "rb3", text: "R3 · Admin gate", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs3",
        variant: "rider",
        step: "R3",
        title: "Admin verification",
        tagline: "Risk & compliance live in the purple console.",
        flowAction: "Ops reviews partner case",
        flowResult: "Pending → Approved",
        copy: "This is the same admin surface that manages bikes — partner rows sit beside fleet records.",
      },
      e(ArtRiderAdminApprove),
    ),
    e(FlowBridge, { key: "rb4", text: "R4 · Activation", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs4",
        variant: "rider",
        step: "R4",
        title: "Rider mode unlocked",
        tagline: "Helmet on, thermal bag staged — UI shifts to partner tooling.",
        flowAction: "Role flag flips server-side",
        flowResult: "Rider dashboard shell",
        copy: "Your character visually upgrades to reflect partner gear while staying the same digital identity.",
      },
      e(ArtRiderActivatedDash),
    ),
    e(FlowBridge, { key: "rb5", text: "R5 · Go online", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs5",
        variant: "rider",
        step: "R5",
        title: "Go online",
        tagline: "Toggle fires availability + warms the green tracking canvas.",
        flowAction: "Offline → Online",
        flowResult: "Map + dispatch socket live",
        copy: `Only online partners ingest ${BRAND_PRODUCT_NAME} hub jobs — identical Mapbox stack as renter tracking, recolored for clarity.`,
      },
      e(ArtRiderGoOnline, { mapboxToken }),
    ),
    e(FlowBridge, { key: "rb6", text: "R6 · Dispatch", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs6",
        variant: "rider",
        step: "R6",
        title: "Incoming fleet job",
        tagline: "Slide-up sheet mirrors production job cards — EV reposition / swap runs.",
        flowAction: "Dispatcher pushes job",
        flowResult: "Partner sees payout + distance",
        copy: "Jobs reference real fleet IDs (e.g. BB-089) so partners never guess which asset they’re moving.",
      },
      e(ArtRiderIncomingOrder),
    ),
    e(FlowBridge, { key: "rb7", text: "R7 · Accept", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs7",
        variant: "rider",
        step: "R7",
        title: "Accept order",
        tagline: "Commit locks the route polyline for navigation SDKs.",
        flowAction: "Tap Accept job",
        flowResult: "Route polyline materializes",
        copy: "Accept hits the API first — optimistic UI still waits on ACK like production mobile builds.",
      },
      e(ArtRiderAcceptRoute),
    ),
    e(FlowBridge, { key: "rb8", text: "R8 · Navigate pickup", variant: "rider" }),
    e(MapSceneSection, {
      key: "rmap8",
      mapboxToken,
      variant: "rider",
      step: "R8",
      title: "Navigate to pickup",
      tagline: "Hub → charger bay — watch the green tracer crawl like Scene 7 renters.",
      flowAction: "GPS streaming",
        flowResult: "Moving dot toward hub",
      copy: "Fallback SVG animates identically without tokens; Mapbox simply swaps in live tiles.",
      uid: "rider-pickup",
    }),
    e(FlowBridge, { key: "rb9", text: "R9 · Pickup proof", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs9",
        variant: "rider",
        step: "R9",
        title: "Pickup confirmation",
        tagline: "Barcode / manual confirm proves custody before leaving hub fence.",
        flowAction: "Confirm pickup",
        flowResult: "Order → In transit",
        copy: "That status feeds admin monitors + renter ETA SMS hooks — one honest state machine.",
      },
      e(ArtRiderPickupConfirm),
    ),
    e(FlowBridge, { key: "rb10", text: "R10 · Navigate drop", variant: "rider" }),
    e(MapSceneSection, {
      key: "rmap10",
      mapboxToken,
      variant: "rider",
      step: "R10",
      title: "Navigate to drop-off",
      tagline: "Route reweights toward subscriber pin or secondary hub.",
      flowAction: "Recompute trip legs",
      flowResult: "Updated green trace",
      copy: "Second map instance proves we can render concurrent rider trips without clashing Mapbox layers.",
      uid: "rider-drop",
    }),
    e(FlowBridge, { key: "rb11", text: "R11 · Drop complete", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs11",
        variant: "rider",
        step: "R11",
        title: "Complete delivery",
        tagline: "Slide-to-confirm avoids pocket completes — same pattern as high-trust fintech apps.",
        flowAction: "Slide to finish",
        flowResult: "Ledger credits rider wallet",
        copy: "Completion events enqueue payouts + star ratings — mirrored on admin dashboards instantly.",
      },
      e(ArtRiderDropSlide),
    ),
    e(FlowBridge, { key: "rb12", text: "R12 · Earnings", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs12",
        variant: "rider",
        step: "R12",
        title: "Earnings screen",
        tagline: "Numbers count up like production wallet refreshes after settlement.",
        flowAction: "Wallet refresh",
        flowResult: "Animated payout total",
        copy: "Green glow reinforces partner success state — identical typography scales as renter payments for brand continuity.",
      },
      e(ArtRiderEarningsCountUp),
    ),
    e(FlowBridge, { key: "rb13", text: "R13 · Stats", variant: "rider" }),
    e(
      SceneSection,
      {
        key: "rs13",
        variant: "rider",
        step: "R13",
        title: "Rider stats refresh",
        tagline: "Ratings + lifetime deliveries influence dispatch priority.",
        flowAction: "Stats pipeline runs",
        flowResult: "Rating & job count bump",
        copy: "Quality loops back into ops — low ratings pause auto-dispatch until coaches intervene.",
      },
      e(ArtRiderStatsPanel),
    ),
    e(FlowBridge, { key: "rb14", text: "R14 · Admin eyes on", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "rs14",
        variant: "admin",
        step: "R14",
        title: "Admin monitoring",
        tagline: "Purple console fuses rider telemetry + earnings pools + map.",
        flowAction: "Ops dashboard polls",
        flowResult: "Live partners + revenue tiles",
        copy: "This closes the triangle: orange renters, green partners, blue admins — one Supabase-shaped truth.",
      },
      e(ArtRiderAdminMonitorCapsule, { mapboxToken }),
    ),
    e(FlowBridge, { key: "rbend", text: "Rider loop → back to ops", variant: "rider" }),
  ];
}

function AdminStoryBlocks(mapboxToken) {
  return [
    e(FlowBridge, { key: "ab1", text: "Admin A1 · Dashboard", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa1",
        variant: "admin",
        step: "Admin A1",
        title: "Admin dashboard",
        tagline: "Fleet, demand, and earnings in one glance — the control room before bookings hit.",
        flowAction: "Load ops console",
        flowResult: "Live counts · revenue pulse",
        copy: "These stats anchor everything downstream: you size fleet capacity and verify payouts align with rides.",
      },
      e(ArtAdminA1Dashboard),
    ),
    e(FlowBridge, { key: "ab2", text: "Admin A2 · Add bike", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa2",
        variant: "admin",
        step: "Admin A2",
        title: "Add bike to fleet",
        tagline: "Metal becomes a managed asset with a clean form submission.",
        flowAction: "Submit fleet form",
        flowResult: "Bike listed internally",
        copy: "Once saved, the bike exists for IoT pairing, pricing tiers, and renter catalog surfacing.",
      },
      e(ArtAdminA2AddBike),
    ),
    e(FlowBridge, { key: "ab3", text: "Admin A3 · Device link", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa3",
        variant: "admin",
        step: "Admin A3",
        title: "IoT / GPS handshake",
        tagline: "Physically mount the module; digitally bind it with a stable vehicle id.",
        flowAction: "Pair telemetry unit",
        flowResult: "vehicle_uuid stored",
        copy: "Unlock APIs and live maps key off this link — treat it like the bike’s passport in Supabase + IoT.",
      },
      e(ArtAdminA3DeviceLink),
    ),
    e(FlowBridge, { key: "ab4", text: "Admin A4 · Map preview", variant: "admin" }),
    e(MapSceneSection, {
      key: "mapa4",
      mapboxToken,
      variant: "admin",
      step: "Admin A4",
      title: "Tracking setup",
      tagline: "Sanity-check geo streams before renters depend on them.",
      flowAction: "Feed GPS test points",
      flowResult: "Animated dot on route",
      copy: "Purple-accent preview mirrors production telemetry — swap token on for Mapbox, or run the fallback sweep.",
      uid: "admin-a4",
    }),
    e(FlowBridge, { key: "ab5", text: "Admin A5 · Pricing", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa5",
        variant: "admin",
        step: "Admin A5",
        title: "Subscription & pricing",
        tagline: "Plans determine what renters see at checkout.",
        flowAction: "Publish tiers",
        flowResult: "Activation badges on",
        copy: "Flip plans active with confidence — Razorpay amounts and app SKUs stay aligned with these rows.",
      },
      e(ArtAdminA5Pricing),
    ),
    e(FlowBridge, { key: "ab6", text: "Admin A6 · Go live", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa6",
        variant: "admin",
        step: "Admin A6",
        title: "Bike goes live",
        tagline: "Flip availability only after hardware + pricing checks pass.",
        flowAction: "Mark operational",
        flowResult: "Available for booking",
        copy: "Inactive → active mirrors what your renters feel: the scooter lights up in search once Ops clears it.",
      },
      e(ArtAdminA6BikeLive),
    ),
    e(FlowBridge, { key: "ab7", text: "Admin A7 · Booking ping", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa7",
        variant: "admin",
        step: "Admin A7",
        title: "Booking enters queue",
        tagline: "Same renter tap now pings your console instantly.",
        flowAction: "Listener fires",
        flowResult: "New booking toast",
        copy: "This is the seam between marketing funnel and payment verification — monitor SLAs from here.",
      },
      e(ArtAdminA7NewBooking),
    ),
    e(FlowBridge, { key: "ab8", text: "Admin A8 · Razorpay verify", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa8",
        variant: "admin",
        step: "Admin A8",
        title: "Payment verification",
        tagline: "Never trust client-side success banners alone.",
        flowAction: "Verify Razorpay signature",
        flowResult: "Ledger + order confirmed",
        copy: "Server-side checks mirror production middleware — only verified intents unlock hardware downstream.",
      },
      e(ArtAdminA8VerifyPayment),
    ),
    e(FlowBridge, { key: "ab9", text: "Admin A9 · Live monitor", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa9",
        variant: "admin",
        step: "Admin A9",
        title: "Live monitoring",
        tagline: "Ops watches battery health and route adherence while rides run.",
        flowAction: "Stream trip telemetry",
        flowResult: "Map + battery HUD",
        copy: "Side-by-side map and telemetry cards echo what Scene 7 shows renters — same IoT feed, operator lens.",
      },
      e(ArtAdminA9OpsMonitor, { mapboxToken }),
    ),
    e(FlowBridge, { key: "ab10", text: "Admin A10 · Earnings", variant: "admin" }),
    e(
      SceneSection,
      {
        key: "aa10",
        variant: "admin",
        step: "Admin A10",
        title: "Earnings pulse",
        tagline: "Close the loop: rides become recognized revenue.",
        flowAction: "Aggregate settlements",
        flowResult: "Trend graph updates",
        copy: "Finance + Ops reconcile against the same payments you verified — training viewers see how monitoring feeds cash charts.",
      },
      e(ArtAdminA10Earnings),
    ),
    e(FlowBridge, { key: "abend", text: "Admin pipeline → feeds renter app", variant: "admin" }),
  ];
}

function VerticalStoryApp({ mapboxToken }) {
  const [flowMode, setFlowMode] = useState("user");
  const userBlocks = UserStoryBlocks(mapboxToken);
  const riderBlocks = RiderStoryBlocks(mapboxToken);
  const adminBlocks = AdminStoryBlocks(mapboxToken);

  const footer = e(
    motion.footer,
    {
      key: "foot",
      style: {
        textAlign: "center",
        padding: "48px 24px 80px",
        color: "#6b7280",
        fontSize: 13,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      },
      initial: { opacity: 0 },
      whileInView: { opacity: 1 },
      viewport: { once: true },
    },
    `${BRAND_PRODUCT_NAME} · User → Rider → Admin · one rental platform story`,
  );

  const bandUser = e("div", { key: "band-user", className: "sw-v-story-band sw-v-story-band--user" }, ...userBlocks);
  const bandRider = e("div", { key: "band-rider", className: "sw-v-story-band sw-v-story-band--rider" }, ...riderBlocks);
  const bandAdmin = e("div", { key: "band-admin", className: "sw-v-story-band sw-v-story-band--admin" }, ...adminBlocks);

  let main;
  if (flowMode === "user") main = [bandUser, footer];
  else if (flowMode === "rider") main = [bandRider, footer];
  else main = [bandAdmin, footer];

  return e(
    "div",
    { className: "sw-v-story" },
    e(Hero, { flowMode }),
    e(FlowModeToggle, { mode: flowMode, onChange: setFlowMode }),
    ...main,
  );
}

const mount = document.getElementById("sw-story-root");
if (mount) {
  const mapboxToken = (mount.dataset.mapboxToken || "").trim();
  createRoot(mount).render(e(VerticalStoryApp, { mapboxToken }));
}
