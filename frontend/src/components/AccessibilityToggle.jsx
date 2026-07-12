import { useState } from "react";

/**
 * AccessibilityToggle — Floating accessibility controls.
 *
 * Provides:
 * - High-contrast mode toggle
 * - Font size scaling (increase/decrease)
 * - Screen reader assistance (uses browser SpeechSynthesis)
 */
export default function AccessibilityToggle({
  highContrast,
  fontScale,
  onToggleContrast,
  onAdjustFont,
}) {
  const [isOpen, setIsOpen] = useState(false);

  /** Read the current page heading aloud using SpeechSynthesis API. */
  const speakPageContent = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const heading = document.querySelector("h1");
    const text = heading
      ? `You are on the ${heading.textContent} page of ArenaSphere, the FIFA World Cup 2026 Smart Stadium Hub.`
      : "Welcome to ArenaSphere, the FIFA World Cup 2026 Smart Stadium Hub.";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="a11y-toggle">
      {isOpen && (
        <div className="a11y-toggle__panel" role="dialog" aria-label="Accessibility settings">
          <h3 className="a11y-toggle__panel-title">♿ Accessibility</h3>

          {/* High Contrast */}
          <div className="a11y-toggle__option">
            <span className="a11y-toggle__label">High Contrast</span>
            <button
              className={`a11y-toggle__switch ${highContrast ? "a11y-toggle__switch--active" : ""}`}
              onClick={onToggleContrast}
              role="switch"
              aria-checked={highContrast}
              aria-label="Toggle high contrast mode"
            />
          </div>

          {/* Font Size */}
          <div className="a11y-toggle__option">
            <span className="a11y-toggle__label">Text Size</span>
            <div className="a11y-toggle__size-controls">
              <button
                className="a11y-toggle__size-btn"
                onClick={() => onAdjustFont(-0.1)}
                aria-label="Decrease font size"
              >
                A-
              </button>
              <span className="a11y-toggle__size-value">{Math.round(fontScale * 100)}%</span>
              <button
                className="a11y-toggle__size-btn"
                onClick={() => onAdjustFont(0.1)}
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          {/* Speech Assist */}
          <div className="a11y-toggle__option">
            <span className="a11y-toggle__label">Read Aloud</span>
            <button
              className="a11y-toggle__size-btn"
              onClick={speakPageContent}
              aria-label="Read page content aloud"
            >
              🔊
            </button>
          </div>
        </div>
      )}

      <button
        className="a11y-toggle__btn"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close accessibility settings" : "Open accessibility settings"}
        aria-expanded={isOpen}
      >
        ♿
      </button>
    </div>
  );
}
