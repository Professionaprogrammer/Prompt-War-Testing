import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";

/* ==========================================================================
 *  STADIUM ZONE DATA
 * ========================================================================== */

/** Zone definitions for the interactive SVG stadium map. */
const ZONES = [
  { id: "north",  label: "Zone N — Gate A", color: "hsl(188, 80%, 40%)", x: 200, y: 30,  w: 200, h: 60,  info: "Gate A • Tacos El Campeón • First Aid North • ♿ Accessible Entry" },
  { id: "east",   label: "Zone E — Gate B", color: "hsl(265, 70%, 45%)", x: 410, y: 100, w: 60,  h: 180, info: "Gate B • Sushi Express • Pasta Corner • Restrooms Level 1" },
  { id: "south",  label: "Zone S — Gate C", color: "hsl(152, 70%, 38%)", x: 200, y: 290, w: 200, h: 60,  info: "Gate C • BBQ Pit • Veggie Garden (Vegan/Halal) • ♿ Accessible Entry" },
  { id: "west",   label: "Zone W — Gate D", color: "hsl(42, 90%, 48%)",  x: 130, y: 100, w: 60,  h: 180, info: "Gate D • Crêpes & Café • Smoothie Bar • Eco Lounge" },
  { id: "nw-sec", label: "Section 101-104", color: "hsl(200, 60%, 35%)", x: 150, y: 95,  w: 60,  h: 80,  info: "Sections 101–104 • Upper concourse • Water Refill Station" },
  { id: "ne-sec", label: "Section 105-108", color: "hsl(220, 60%, 35%)", x: 390, y: 95,  w: 60,  h: 80,  info: "Sections 105–108 • Medical Pod East • AED unit" },
  { id: "sw-sec", label: "Section 109-112", color: "hsl(170, 60%, 35%)", x: 150, y: 205, w: 60,  h: 80,  info: "Sections 109–112 • Family zone • Baby changing rooms" },
  { id: "se-sec", label: "Section 113-116", color: "hsl(30, 60%, 38%)",  x: 390, y: 205, w: 60,  h: 80,  info: "Sections 113–116 • VIP entrance • Premium lounge access" },
  { id: "field",  label: "Pitch",            color: "hsl(130, 60%, 28%)", x: 220, y: 110, w: 160, h: 160, info: "⚽ FIFA World Cup 2026 — The pitch is ready!" },
];

/** Amenity markers overlaid on the map. */
const AMENITIES = [
  { id: "fa-n",  emoji: "🏥", x: 290, y: 50,  label: "First Aid North" },
  { id: "fa-s",  emoji: "🏥", x: 290, y: 310, label: "First Aid South" },
  { id: "food1", emoji: "🍔", x: 165, y: 50,  label: "Food Court NW" },
  { id: "food2", emoji: "🍣", x: 435, y: 180, label: "Food Court E" },
  { id: "water", emoji: "💧", x: 210, y: 50,  label: "Water Refill" },
  { id: "wc1",   emoji: "🚻", x: 440, y: 120, label: "Restrooms East" },
  { id: "eco",   emoji: "♻️",  x: 140, y: 300, label: "Eco Lounge" },
  { id: "acc1",  emoji: "♿",  x: 240, y: 25,  label: "Accessible Entry A" },
  { id: "acc2",  emoji: "♿",  x: 240, y: 340, label: "Accessible Entry C" },
];

/** Quick-prompt suggestions for the AI chat. */
const QUICK_PROMPTS = [
  "Where is Gate C?",
  "Nearest food options",
  "Water refill stations",
  "Accessibility services",
  "Shuttle schedule",
  "Emergency info",
  "Recycling locations",
  "Match schedule",
];

/* ==========================================================================
 *  COMPONENT
 * ========================================================================== */

/**
 * FanHub — Spectator-facing dashboard.
 *
 * Features:
 * 1. Interactive SVG stadium map with clickable zones and amenity overlays.
 * 2. AI-powered fan concierge chat (calls backend /api/chat).
 * 3. Gamified eco-challenge tracker.
 */
export default function FanHub() {
  const [selectedZone, setSelectedZone] = useState(null);
  const [messages, setMessages] = useState([
    { role: "ai", text: "👋 **Welcome to ArenaSphere!**\nI'm your AI concierge for FIFA World Cup 2026. Ask me about gates, food, accessibility, sustainability, or anything else!", source: "system" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatLang, setChatLang] = useState("en");
  const [ecoPoints, setEcoPoints] = useState(35);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  /** Send a chat message to the backend. */
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || chatInput).trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, language: chatLang }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply, source: data.source }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `⚠️ Could not reach the assistant. Please check the backend connection.\n\n_Error: ${err.message}_` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [chatInput, isLoading, chatLang]);

  /** Handle Enter key in chat input. */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /** Log an eco action and award points. */
  const logEcoAction = (action, pts) => {
    setEcoPoints((p) => Math.min(100, p + pts));
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: `🌱 **Eco Action Logged:** ${action}\nYou earned **+${pts} Eco-Points**! Keep up the great work! 💚` },
    ]);
  };

  /** Zone information panel. */
  const zoneInfo = selectedZone ? ZONES.find((z) => z.id === selectedZone) : null;

  return (
    <section aria-labelledby="fanhub-heading">
      <header className="page-header">
        <h1 id="fanhub-heading" className="page-header__title">
          <span className="page-header__accent">Fan</span> Hub
        </h1>
        <p className="page-header__subtitle">
          Your personal guide to the stadium — navigate, explore, and go green.
        </p>
      </header>

      <div className="fanhub">
        {/* ---- Interactive Stadium Map ---- */}
        <div className="glass-card fanhub__full">
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🗺️</span>
            <h2 className="glass-card__title">Stadium Map</h2>
            {zoneInfo && (
              <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: "var(--color-accent-gold)" }}>
                📍 {zoneInfo.label}
              </span>
            )}
          </div>

          <div className="stadium-map" role="img" aria-label="Interactive stadium layout">
            <svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg">
              {/* Background */}
              <rect width="600" height="380" fill="hsl(222, 47%, 7%)" rx="12" />

              {/* Stadium outline */}
              <ellipse cx="300" cy="190" rx="250" ry="170" fill="none" stroke="hsla(218,30%,30%,0.3)" strokeWidth="1" />

              {/* Zones */}
              {ZONES.map((zone) => (
                <g key={zone.id} onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}>
                  <rect
                    className={`stadium-zone ${selectedZone === zone.id ? "stadium-zone--selected" : ""}`}
                    x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                    rx="6"
                    fill={zone.color}
                    fillOpacity={selectedZone === zone.id ? 0.8 : 0.45}
                  />
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize={zone.id === "field" ? "14" : "9"}
                    fontFamily="var(--font-heading)"
                    fontWeight="700"
                    pointerEvents="none"
                    opacity="0.9"
                  >
                    {zone.id === "field" ? "⚽ Pitch" : zone.label.split(" — ")[0]}
                  </text>
                </g>
              ))}

              {/* Amenity markers */}
              {AMENITIES.map((a) => (
                <text
                  key={a.id}
                  x={a.x} y={a.y}
                  fontSize="14"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ cursor: "pointer" }}
                  aria-label={a.label}
                >
                  {a.emoji}
                </text>
              ))}
            </svg>

            {/* Legend */}
            <div className="map-legend">
              <div className="map-legend__item">
                <span className="map-legend__dot" style={{ background: "var(--color-accent-cyan)" }} />
                Gate
              </div>
              <div className="map-legend__item">
                <span className="map-legend__dot" style={{ background: "var(--color-accent-green)" }} />
                Food
              </div>
              <div className="map-legend__item">
                <span className="map-legend__dot" style={{ background: "var(--color-accent-gold)" }} />
                Amenity
              </div>
            </div>
          </div>

          {/* Zone details */}
          {zoneInfo && (
            <div style={{
              marginTop: "var(--space-md)",
              padding: "var(--space-md)",
              background: "var(--color-bg-glass)",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--color-accent-gold)",
              fontSize: "0.88rem",
              animation: "fadeUp 0.3s ease-out",
            }}>
              <strong>{zoneInfo.label}</strong>
              <p style={{ color: "var(--color-text-secondary)", marginTop: "4px" }}>{zoneInfo.info}</p>
            </div>
          )}
        </div>

        {/* ---- AI Fan Concierge Chat ---- */}
        <div className="glass-card">
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🤖</span>
            <h2 className="glass-card__title">AI Concierge</h2>
            <select
              value={chatLang}
              onChange={(e) => setChatLang(e.target.value)}
              aria-label="Chat language"
              style={{
                marginLeft: "auto",
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              <option value="en">🇬🇧 English</option>
              <option value="es">🇪🇸 Español</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="ar">🇸🇦 العربية</option>
              <option value="pt">🇧🇷 Português</option>
            </select>
          </div>

          <div className="chat">
            <div className="chat__messages" role="log" aria-label="Chat messages" aria-live="polite">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat__bubble chat__bubble--${msg.role === "user" ? "user" : "ai"}`}
                >
                  {formatMessageText(msg.text)}
                  {msg.source && msg.role === "ai" && (
                    <span style={{
                      display: "block",
                      marginTop: "6px",
                      fontSize: "0.65rem",
                      color: msg.source === "gemini" ? "var(--color-accent-cyan)" : "var(--color-text-muted)",
                      opacity: 0.7,
                    }}>
                      {msg.source === "gemini" ? "🤖 Gemini AI" : msg.source === "simulator" ? "🎮 Simulator" : ""}
                    </span>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="chat__bubble chat__bubble--ai chat__bubble--loading">
                  <span className="chat__dot" />
                  <span className="chat__dot" />
                  <span className="chat__dot" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat__quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="chat__prompt-btn"
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="chat__input-row">
              <input
                className="chat__input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about the stadium..."
                aria-label="Chat message input"
                disabled={isLoading}
              />
              <button
                className="chat__send-btn"
                onClick={() => sendMessage()}
                disabled={isLoading || !chatInput.trim()}
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* ---- Eco-Challenge Tracker ---- */}
        <div className="glass-card">
          <div className="glass-card__header">
            <span className="glass-card__icon" aria-hidden="true">🌱</span>
            <h2 className="glass-card__title">Eco-Challenge</h2>
          </div>

          <div className="eco-tracker__score">
            <span className="eco-tracker__points">{ecoPoints}</span>
            <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
              / 100 Eco-Points
            </span>
          </div>

          <div className="eco-tracker__bar" role="progressbar" aria-valuenow={ecoPoints} aria-valuemin="0" aria-valuemax="100">
            <div className="eco-tracker__fill" style={{ width: `${ecoPoints}%` }} />
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "var(--space-md)" }}>
            {ecoPoints >= 50
              ? "🌳 Amazing! You've earned a tree planted in your name!"
              : `Collect ${50 - ecoPoints} more points to plant a tree in your name!`}
          </p>

          <div className="eco-tracker__actions">
            <button className="eco-tracker__action-btn" onClick={() => logEcoAction("Recycled a bottle", 5)}>
              ♻️ Recycle Bottle (+5)
            </button>
            <button className="eco-tracker__action-btn" onClick={() => logEcoAction("Used water refill station", 5)}>
              💧 Water Refill (+5)
            </button>
            <button className="eco-tracker__action-btn" onClick={() => logEcoAction("Used reusable cup", 10)}>
              🥤 Reusable Cup (+10)
            </button>
            <button className="eco-tracker__action-btn" onClick={() => logEcoAction("Took public transit", 15)}>
              🚌 Public Transit (+15)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Helper to render basic markdown-like syntax (**bold**, list items, newlines) in chat bubbles.
 * @param {string} text - Raw text containing markdown.
 * @returns {JSX.Element[]} Formatted react elements.
 */
function formatMessageText(rawText) {
  if (!rawText) return "";
  const text = DOMPurify.sanitize(rawText, { ALLOWED_TAGS: [] }); // Strip all HTML to prevent XSS
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    // Check if line is a bullet point
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const cleanLine = isBullet ? trimmed.substring(2) : line;

    // Process bold text (**text**)
    const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
    const content = parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} style={{ display: "flex", gap: "var(--space-xs)", marginLeft: "var(--space-sm)", marginBottom: "4px" }}>
          <span>•</span>
          <div>{content}</div>
        </div>
      );
    }

    return (
      <div key={lineIdx} style={{ minHeight: "1.2em", marginBottom: "4px" }}>
        {content}
      </div>
    );
  });
}
