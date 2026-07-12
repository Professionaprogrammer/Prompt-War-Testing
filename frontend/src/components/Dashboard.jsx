import { useState, useEffect, useRef, useCallback } from "react";

/* ---------- Static initial data ----------------------------------------- */

/** Simulated real-time stadium metrics — continuously updated by intervals. */
const INITIAL_STATS = [
  { id: "attendance",  icon: "👥", label: "Current Attendance",     value: 62847,   trend: "+1,230",  direction: "up" },
  { id: "gates",       icon: "🚪", label: "Active Gates",           value: "14/16", trend: "2 maint.", direction: "down" },
  { id: "wait",        icon: "⏱️",  label: "Avg Gate Wait",          value: "4.2 min", trend: "-0.8 min", direction: "up" },
  { id: "transit",     icon: "🚌", label: "Shuttle Occupancy",      value: "78%",   trend: "+5%",     direction: "up" },
  { id: "eco",         icon: "♻️",  label: "Waste Recycled",         value: "2.4 t", trend: "+0.3 t",  direction: "up" },
  { id: "medical",     icon: "🏥", label: "Medical Incidents Today", value: 3,       trend: "All resolved", direction: "up" },
];

/** Live alerts feed — initial seed, dynamically updated. */
const INITIAL_ALERTS = [
  { id: 1, type: "info",     icon: "ℹ️",  title: "Gate B Re-opened",           desc: "Maintenance complete. Gate B is fully operational.", time: "2 min ago" },
  { id: 2, type: "warning",  icon: "⚠️",  title: "Zone N Congestion Rising",   desc: "North concourse at 82% capacity. Consider redirecting.", time: "5 min ago" },
  { id: 3, type: "success",  icon: "✅",  title: "Shuttle S2 Arrived",         desc: "48 passengers unloaded at North Plaza drop-off.",      time: "8 min ago" },
  { id: 4, type: "critical", icon: "🚨", title: "RFID Scanner Offline",       desc: "Gate D Lane 3 scanner non-responsive. IT dispatched.", time: "12 min ago" },
  { id: 5, type: "info",     icon: "🌡️",  title: "Temperature Update",         desc: "Current: 28 °C, UV Index: 6. Sun-screen stations active.", time: "15 min ago" },
  { id: 6, type: "success",  icon: "🌱",  title: "Eco Milestone Reached",      desc: "2 tonnes of waste recycled — ahead of target by 12%.", time: "20 min ago" },
];

/** Dynamic alert templates for simulating new incoming alerts. */
const DYNAMIC_ALERT_POOL = [
  { type: "info",     icon: "📡",  title: "Comm Check Complete",       desc: "All radio channels operational across 4 zones." },
  { type: "warning",  icon: "🔥",  title: "Zone E Temp Rising",        desc: "East concourse temperature 31°C — activating additional cooling." },
  { type: "success",  icon: "🎫",  title: "Ticket Scan Rate Normal",   desc: "Gate A processing 240 fans/min — well within capacity." },
  { type: "info",     icon: "🅿️",  title: "Parking Lot P2 at 85%",     desc: "Redirecting overflow to P3 with shuttle connection." },
  { type: "warning",  icon: "👥",  title: "Section 108 Near Capacity", desc: "Upper bowl Section 108 at 94% — stewards alerted." },
  { type: "success",  icon: "💧",  title: "Water Stations Restocked",  desc: "All 8 refill stations replenished and operational." },
  { type: "critical", icon: "⚡",  title: "Power Fluctuation Detected", desc: "Zone S lighting circuit B — facilities team responding." },
  { type: "info",     icon: "🚇",  title: "Metro Line 3 On Schedule",  desc: "Next arrival in 4 minutes at Stadium West station." },
];

/**
 * Dashboard — Overview screen with real-time metrics, live match display,
 * AI operational insights, and a dynamic alerts feed.
 *
 * Fetches AI insights from /api/dashboard (GenAI-powered) and simulates
 * live stadium data streams for attendance, match time, and alerts.
 */
export default function Dashboard() {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [matchMinute, setMatchMinute] = useState(34);
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [aiSource, setAiSource] = useState(null);
  const timerRef = useRef(null);
  const alertIdRef = useRef(7); // next alert ID

  /* Simulate match minute progression. */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setMatchMinute((m) => (m >= 90 ? 1 : m + 1));
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  /* Simulate attendance fluctuation every 6 seconds. */
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) =>
        prev.map((s) => {
          if (s.id === "attendance") {
            const delta = Math.floor(Math.random() * 50) - 10;
            const newVal = Math.max(60000, (typeof s.value === "number" ? s.value : 62847) + delta);
            return { ...s, value: newVal, trend: `+${Math.abs(delta)}` };
          }
          if (s.id === "wait") {
            const waitVal = (3.0 + Math.random() * 3).toFixed(1);
            const prev_val = parseFloat(s.value) || 4.2;
            const diff = (waitVal - prev_val).toFixed(1);
            return { ...s, value: `${waitVal} min`, trend: `${diff > 0 ? "+" : ""}${diff} min`, direction: diff > 0 ? "down" : "up" };
          }
          if (s.id === "transit") {
            const occ = Math.floor(65 + Math.random() * 30);
            return { ...s, value: `${occ}%`, trend: occ > 85 ? "High load" : "Normal", direction: occ > 85 ? "down" : "up" };
          }
          return s;
        })
      );
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  /* Simulate new alerts arriving every 15 seconds. */
  useEffect(() => {
    const interval = setInterval(() => {
      const pool = DYNAMIC_ALERT_POOL;
      const template = pool[Math.floor(Math.random() * pool.length)];
      const newAlert = {
        ...template,
        id: alertIdRef.current++,
        time: "Just now",
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 8));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  /** Fetch AI-powered operational insights from backend. */
  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const currentStats = {};
      stats.forEach((s) => { currentStats[s.id] = s.value; });

      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats: currentStats }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAiInsights(data);
      setAiSource(data.source);
    } catch (err) {
      setAiInsights({
        insights: ["Connection error — retrying...", `${err.message}`, "Check backend status"],
        recommendation: "Verify backend is running on port 3001.",
        crowdTrend: "stable",
        riskLevel: "low",
        sustainabilityTip: "Every recycled item counts! ♻️",
      });
      setAiSource("error");
    } finally {
      setInsightsLoading(false);
    }
  }, [stats]);

  /* Auto-fetch insights on mount and every 30 seconds. */
  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Risk level colour mapping. */
  const riskColor = (level) => {
    const map = {
      low: "var(--color-accent-green)",
      moderate: "var(--color-accent-gold)",
      elevated: "var(--color-accent-orange)",
      high: "var(--color-accent-red)",
    };
    return map[level] || "var(--color-text-secondary)";
  };

  return (
    <section aria-labelledby="dashboard-heading">
      {/* Page Header */}
      <header className="page-header">
        <h1 id="dashboard-heading" className="page-header__title">
          <span className="page-header__accent">Command</span> Dashboard
        </h1>
        <p className="page-header__subtitle">
          Real-time stadium intelligence — FIFA World Cup 2026
          {aiSource && (
            <span style={{
              marginLeft: "var(--space-md)",
              padding: "2px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.7rem",
              fontWeight: 600,
              background: aiSource === "gemini" ? "hsla(188, 100%, 50%, 0.12)" : "hsla(42, 100%, 55%, 0.12)",
              color: aiSource === "gemini" ? "var(--color-accent-cyan)" : "var(--color-accent-gold)",
              border: `1px solid ${aiSource === "gemini" ? "hsla(188, 100%, 50%, 0.25)" : "hsla(42, 100%, 55%, 0.25)"}`,
            }}>
              {aiSource === "gemini" ? "🤖 AI Powered" : "🎮 Simulator"}
            </span>
          )}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        {stats.map((stat) => (
          <article key={stat.id} className="glass-card stat-card">
            <span className="stat-card__bg-icon" aria-hidden="true">{stat.icon}</span>
            <div className="stat-card__value">
              {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
            </div>
            <div className="stat-card__label">{stat.label}</div>
            <span className={`stat-card__trend stat-card__trend--${stat.direction}`}>
              {stat.direction === "up" ? "▲" : "▼"} {stat.trend}
            </span>
          </article>
        ))}
      </div>

      {/* AI Insights Panel */}
      {aiInsights && (
        <div className="glass-card" style={{ marginBottom: "var(--space-xl)" }}>
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🧠</span>
            <h2 className="glass-card__title">AI Operational Intelligence</h2>
            <button
              onClick={fetchInsights}
              disabled={insightsLoading}
              style={{
                marginLeft: "auto",
                padding: "4px 14px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                fontSize: "0.78rem",
                opacity: insightsLoading ? 0.5 : 1,
              }}
            >
              {insightsLoading ? "⏳ Analyzing..." : "🔄 Refresh"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
            {/* Insights list */}
            <div>
              <h3 style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
                Live Insights
              </h3>
              {aiInsights.insights?.map((insight, i) => (
                <div key={i} style={{
                  padding: "var(--space-sm) var(--space-md)",
                  background: "var(--color-bg-glass)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "var(--space-xs)",
                  fontSize: "0.85rem",
                  borderLeft: "3px solid var(--color-accent-cyan)",
                }}>
                  {insight}
                </div>
              ))}
            </div>

            {/* Status indicators */}
            <div>
              <h3 style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
                Status
              </h3>
              <div style={{
                padding: "var(--space-md)",
                background: "var(--color-bg-glass)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-sm)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-sm)", fontSize: "0.82rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Risk Level</span>
                  <span style={{ color: riskColor(aiInsights.riskLevel), fontWeight: 700, textTransform: "uppercase" }}>
                    ● {aiInsights.riskLevel || "low"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-sm)", fontSize: "0.82rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Crowd Trend</span>
                  <span style={{ fontWeight: 600 }}>
                    {aiInsights.crowdTrend === "increasing" ? "📈" : aiInsights.crowdTrend === "decreasing" ? "📉" : "➡️"} {aiInsights.crowdTrend || "stable"}
                  </span>
                </div>
              </div>

              <div style={{
                padding: "var(--space-md)",
                background: "hsla(42, 100%, 55%, 0.08)",
                borderRadius: "var(--radius-md)",
                border: "1px solid hsla(42, 100%, 55%, 0.2)",
                fontSize: "0.82rem",
              }}>
                <strong style={{ color: "var(--color-accent-gold)" }}>💡 Recommendation:</strong>
                <p style={{ color: "var(--color-text-secondary)", marginTop: "4px" }}>
                  {aiInsights.recommendation}
                </p>
              </div>

              {aiInsights.sustainabilityTip && (
                <div style={{
                  marginTop: "var(--space-sm)",
                  padding: "var(--space-sm) var(--space-md)",
                  background: "hsla(152, 80%, 50%, 0.08)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid hsla(152, 80%, 50%, 0.2)",
                  fontSize: "0.8rem",
                  color: "var(--color-accent-green)",
                }}>
                  🌱 {aiInsights.sustainabilityTip}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Match + Alerts row */}
      <div className="dashboard__row">
        {/* Live Match Card */}
        <div className="match-card">
          <div className="match-card__live-badge">
            <span className="match-card__live-dot" aria-hidden="true" />
            Live — {matchMinute}&apos;
          </div>
          <div className="match-card__teams">
            <div className="match-card__team">
              <div className="match-card__flag" aria-label="Mexico flag">🇲🇽</div>
              <div className="match-card__team-name">Mexico</div>
            </div>
            <div className="match-card__score" aria-live="polite">2 — 1</div>
            <div className="match-card__team">
              <div className="match-card__flag" aria-label="USA flag">🇺🇸</div>
              <div className="match-card__team-name">USA</div>
            </div>
          </div>
          <div className="match-card__info">
            Group Stage · MetLife Stadium, NJ · {stats.find(s => s.id === "attendance")?.value?.toLocaleString() || "62,847"} in attendance
          </div>
        </div>

        {/* Alerts Feed */}
        <div className="glass-card">
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🔔</span>
            <h2 className="glass-card__title">Live Alerts</h2>
            <span style={{
              marginLeft: "auto",
              fontSize: "0.7rem",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              background: "hsla(0, 85%, 60%, 0.12)",
              color: "var(--color-accent-red)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}>
              ● LIVE
            </span>
          </div>
          <div className="alerts-feed" role="log" aria-label="Live alerts">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-item alert-item--${alert.type}`}>
                <span className="alert-item__icon" aria-hidden="true">{alert.icon}</span>
                <div className="alert-item__content">
                  <div className="alert-item__title">{alert.title}</div>
                  <div className="alert-item__desc">{alert.desc}</div>
                </div>
                <span className="alert-item__time">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
