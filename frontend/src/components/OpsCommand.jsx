import { useState, useCallback } from "react";

/* ==========================================================================
 *  STATIC DATA
 * ========================================================================== */

/** Heatmap zone congestion data (simulated). */
const HEATMAP_ZONES = [
  { id: "north",  label: "Zone N", x: 200, y: 30,  w: 200, h: 60,  level: "high" },
  { id: "east",   label: "Zone E", x: 410, y: 100, w: 60,  h: 180, level: "low" },
  { id: "south",  label: "Zone S", x: 200, y: 290, w: 200, h: 60,  level: "med" },
  { id: "west",   label: "Zone W", x: 130, y: 100, w: 60,  h: 180, level: "med" },
  { id: "nw",     label: "Sec 101-104", x: 150, y: 95,  w: 60, h: 80, level: "high" },
  { id: "ne",     label: "Sec 105-108", x: 390, y: 95,  w: 60, h: 80, level: "low" },
  { id: "sw",     label: "Sec 109-112", x: 150, y: 205, w: 60, h: 80, level: "med" },
  { id: "se",     label: "Sec 113-116", x: 390, y: 205, w: 60, h: 80, level: "low" },
  { id: "field",  label: "Pitch",       x: 220, y: 110, w: 160, h: 160, level: "low" },
];

/** Pre-built incident templates for quick selection. */
const INCIDENT_TEMPLATES = [
  "Overcrowding at Gate A — North Concourse at 90% capacity",
  "Medical emergency at Section 105 — fan collapsed",
  "RFID scanners offline at Gate D — manual fallback required",
  "Severe thunderstorm warning — lightning within 10 miles",
  "Suspicious unattended bag at East concourse near Section 108",
  "Power outage affecting jumbotron and PA system in Zone S",
];

/** Language display names for translations. */
const LANG_NAMES = {
  en: "🇬🇧 English",
  es: "🇪🇸 Español",
  fr: "🇫🇷 Français",
  ar: "🇸🇦 العربية",
  pt: "🇧🇷 Português",
};

/* ==========================================================================
 *  COMPONENT
 * ========================================================================== */

/**
 * OpsCommand — Operations Command Center.
 *
 * Features:
 * 1. Live crowd heatmap overlaid on stadium SVG.
 * 2. AI incident resolution co-pilot (calls backend /api/operations/incident).
 * 3. Multilingual broadcast translator (calls backend /api/operations/translate).
 */
export default function OpsCommand() {
  /* ---- Incident State ---- */
  const [incidentText, setIncidentText] = useState("");
  const [responsePlan, setResponsePlan] = useState(null);
  const [incidentLoading, setIncidentLoading] = useState(false);

  /* ---- Translation State ---- */
  const [translateText, setTranslateText] = useState("");
  const [translations, setTranslations] = useState(null);
  const [translateLoading, setTranslateLoading] = useState(false);

  /* ---- Heatmap cycle simulation ---- */
  const [heatmapData, setHeatmapData] = useState(HEATMAP_ZONES);

  /** Randomize heatmap to simulate crowd flow changes. */
  const refreshHeatmap = () => {
    const levels = ["low", "med", "high"];
    setHeatmapData((prev) =>
      prev.map((z) =>
        z.id === "field"
          ? z
          : { ...z, level: levels[Math.floor(Math.random() * 3)] }
      )
    );
  };

  /** Submit incident report to the AI co-pilot. */
  const submitIncident = useCallback(async () => {
    const text = incidentText.trim();
    if (!text || incidentLoading) return;

    setIncidentLoading(true);
    setResponsePlan(null);

    try {
      const res = await fetch("/api/operations/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident: text }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResponsePlan(data.plan);
    } catch (err) {
      setResponsePlan({
        severity: "MEDIUM",
        incident: text,
        immediateActions: [`Error contacting backend: ${err.message}`],
        announcements: [],
        staffTasks: [],
        estimatedResolution: "N/A",
        followUp: "Please verify backend connectivity.",
      });
    } finally {
      setIncidentLoading(false);
    }
  }, [incidentText, incidentLoading]);

  /** Translate an announcement into all languages. */
  const submitTranslation = useCallback(async () => {
    const text = translateText.trim();
    if (!text || translateLoading) return;

    setTranslateLoading(true);
    setTranslations(null);

    try {
      const res = await fetch("/api/operations/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTranslations(data.translations);
    } catch (err) {
      setTranslations({ en: text, error: err.message });
    } finally {
      setTranslateLoading(false);
    }
  }, [translateText, translateLoading]);

  /** Map heat levels to CSS class suffixes. */
  const heatClass = (level) => `stadium-zone--heat-${level}`;

  return (
    <section aria-labelledby="ops-heading">
      <header className="page-header">
        <h1 id="ops-heading" className="page-header__title">
          <span className="page-header__accent">Operations</span> Command
        </h1>
        <p className="page-header__subtitle">
          AI-powered incident resolution, crowd intelligence, and multilingual broadcast.
        </p>
      </header>

      <div className="ops">
        {/* ---- Crowd Heatmap ---- */}
        <div className="glass-card ops__full">
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🔥</span>
            <h2 className="glass-card__title">Crowd Heatmap</h2>
            <button
              onClick={refreshHeatmap}
              style={{
                marginLeft: "auto",
                padding: "4px 14px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                fontSize: "0.78rem",
              }}
            >
              🔄 Refresh
            </button>
          </div>

          <div className="stadium-map" role="img" aria-label="Crowd density heatmap">
            <svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg">
              <rect width="600" height="380" fill="hsl(222, 47%, 7%)" rx="12" />
              <ellipse cx="300" cy="190" rx="250" ry="170" fill="none" stroke="hsla(218,30%,30%,0.3)" strokeWidth="1" />

              {heatmapData.map((zone) => (
                <g key={zone.id}>
                  <rect
                    className={`stadium-zone ${heatClass(zone.level)}`}
                    x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                    rx="6"
                  />
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontFamily="var(--font-heading)"
                    fontWeight="600"
                    pointerEvents="none"
                    opacity="0.85"
                  >
                    {zone.label}
                  </text>
                </g>
              ))}
            </svg>

            <div className="map-legend">
              <div className="map-legend__item">
                <span className="map-legend__dot" style={{ background: "hsl(0, 85%, 50%)" }} />
                High
              </div>
              <div className="map-legend__item">
                <span className="map-legend__dot" style={{ background: "hsl(42, 100%, 55%)" }} />
                Medium
              </div>
              <div className="map-legend__item">
                <span className="map-legend__dot" style={{ background: "hsl(152, 80%, 50%)" }} />
                Low
              </div>
            </div>
          </div>
        </div>

        {/* ---- AI Incident Co-Pilot ---- */}
        <div className="glass-card">
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🚨</span>
            <h2 className="glass-card__title">AI Incident Co-Pilot</h2>
          </div>

          {/* Quick templates */}
          <div className="incident-panel__templates">
            {INCIDENT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl}
                className="incident-panel__template-btn"
                onClick={() => setIncidentText(tmpl)}
              >
                {tmpl.length > 45 ? tmpl.slice(0, 45) + "…" : tmpl}
              </button>
            ))}
          </div>

          <textarea
            className="incident-panel__textarea"
            value={incidentText}
            onChange={(e) => setIncidentText(e.target.value)}
            placeholder="Describe the incident or select a template above..."
            aria-label="Incident description"
            maxLength={800}
          />

          <button
            className="incident-panel__submit"
            onClick={submitIncident}
            disabled={incidentLoading || !incidentText.trim()}
          >
            {incidentLoading ? "Generating Plan..." : "🤖 Generate Response Plan"}
          </button>

          {/* Response Plan Display */}
          {responsePlan && (
            <div className="response-plan" style={{ marginTop: "var(--space-lg)" }}>
              <div className={`response-plan__severity response-plan__severity--${responsePlan.severity || "MEDIUM"}`}>
                ● {responsePlan.severity || "MEDIUM"} Severity
              </div>

              {/* Immediate Actions */}
              {responsePlan.immediateActions?.length > 0 && (
                <div className="response-plan__section">
                  <h3 className="response-plan__section-title">⚡ Immediate Actions</h3>
                  <ul className="response-plan__list">
                    {responsePlan.immediateActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Announcements */}
              {responsePlan.announcements?.length > 0 && (
                <div className="response-plan__section">
                  <h3 className="response-plan__section-title">📢 Announcements</h3>
                  <ul className="response-plan__list">
                    {responsePlan.announcements.map((ann, i) => (
                      <li key={i}>{ann}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Staff Tasks */}
              {responsePlan.staffTasks?.length > 0 && (
                <div className="response-plan__section">
                  <h3 className="response-plan__section-title">👷 Staff Assignments</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                    {responsePlan.staffTasks.map((task, i) => (
                      <div key={i} className="response-plan__staff-item">
                        <div>
                          <span className="response-plan__staff-role">{task.role}</span>
                          <span style={{ marginLeft: "var(--space-sm)", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                            {task.task}
                          </span>
                        </div>
                        <span
                          className="response-plan__staff-priority"
                          style={{
                            background: task.priority === "CRITICAL" || task.priority === "URGENT"
                              ? "hsla(0, 85%, 60%, 0.15)"
                              : "hsla(42, 100%, 55%, 0.15)",
                            color: task.priority === "CRITICAL" || task.priority === "URGENT"
                              ? "var(--color-accent-red)"
                              : "var(--color-accent-gold)",
                          }}
                        >
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution + Follow-up */}
              <div style={{
                padding: "var(--space-md)",
                background: "var(--color-bg-glass)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.82rem",
                color: "var(--color-text-secondary)",
              }}>
                ⏱️ Est. Resolution: <strong>{responsePlan.estimatedResolution}</strong>
                <br />
                📋 {responsePlan.followUp}
              </div>
            </div>
          )}
        </div>

        {/* ---- Broadcast Translator ---- */}
        <div className="glass-card">
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🌐</span>
            <h2 className="glass-card__title">Broadcast Translator</h2>
          </div>

          <textarea
            className="incident-panel__textarea"
            value={translateText}
            onChange={(e) => setTranslateText(e.target.value)}
            placeholder="Enter an announcement in English to translate..."
            aria-label="Announcement to translate"
            maxLength={500}
          />

          <button
            className="incident-panel__submit"
            onClick={submitTranslation}
            disabled={translateLoading || !translateText.trim()}
            style={{ marginBottom: "var(--space-lg)" }}
          >
            {translateLoading ? "Translating..." : "🌍 Translate to All Languages"}
          </button>

          {/* Translations display */}
          {translations && !translations.error && (
            <div className="translation__grid">
              {Object.entries(translations).map(([lang, text]) => (
                <div key={lang} className="translation__card">
                  <div className="translation__lang">
                    {LANG_NAMES[lang] || lang.toUpperCase()}
                  </div>
                  <div className="translation__text">{text}</div>
                </div>
              ))}
            </div>
          )}

          {translations?.error && (
            <div style={{
              padding: "var(--space-md)",
              background: "hsla(0, 85%, 60%, 0.1)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-accent-red)",
              fontSize: "0.85rem",
            }}>
              ⚠️ Translation error: {translations.error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
