/**
 * Sidebar — Navigation sidebar for ArenaSphere.
 *
 * Displays the logo, navigation links (Dashboard, Fan Hub, Ops Command),
 * and a live-status badge showing backend connectivity mode.
 */
export default function Sidebar({ activeView, onNavigate, isOpen }) {
  const links = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "fanhub",    icon: "🏟️", label: "Fan Hub" },
    { id: "ops",       icon: "🎛️", label: "Ops Command" },
  ];

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`} role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon" aria-hidden="true">⚽</div>
        <span className="sidebar__logo-text">ArenaSphere</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {links.map((link) => (
          <button
            key={link.id}
            className={`sidebar__link ${activeView === link.id ? "sidebar__link--active" : ""}`}
            onClick={() => onNavigate(link.id)}
            aria-current={activeView === link.id ? "page" : undefined}
          >
            <span className="sidebar__link-icon" aria-hidden="true">{link.icon}</span>
            {link.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <div className="sidebar__mode-badge">
          <span className="sidebar__mode-dot" aria-hidden="true" />
          System Online
        </div>
        <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "var(--space-sm)" }}>
          FIFA World Cup 2026
        </p>
      </div>
    </aside>
  );
}
