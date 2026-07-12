import { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import FanHub from "./components/FanHub.jsx";
import OpsCommand from "./components/OpsCommand.jsx";
import AccessibilityToggle from "./components/AccessibilityToggle.jsx";

/**
 * App — Root component for ArenaSphere.
 *
 * Manages active view, mobile menu state, and accessibility settings.
 * All accessibility state is lifted here so it can affect the entire app
 * through data attributes on the root element.
 */
export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  /** Toggle high-contrast mode via data attribute on <html>. */
  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-high-contrast", String(next));
      return next;
    });
  }, []);

  /** Adjust font scale (clamped between 0.8 and 1.5). */
  const adjustFontScale = useCallback((delta) => {
    setFontScale((prev) => {
      const next = Math.min(1.5, Math.max(0.8, +(prev + delta).toFixed(2)));
      document.documentElement.style.setProperty("--font-scale", String(next));
      return next;
    });
  }, []);

  /** Navigate to a view and close mobile menu. */
  const navigate = useCallback((view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="app-layout">
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen((o) => !o)}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      <Sidebar
        activeView={activeView}
        onNavigate={navigate}
        isOpen={mobileMenuOpen}
      />

      <main className="main-content" role="main">
        {activeView === "dashboard" && <Dashboard />}
        {activeView === "fanhub" && <FanHub />}
        {activeView === "ops" && <OpsCommand />}
      </main>

      <AccessibilityToggle
        highContrast={highContrast}
        fontScale={fontScale}
        onToggleContrast={toggleHighContrast}
        onAdjustFont={adjustFontScale}
      />
    </div>
  );
}
