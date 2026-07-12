import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../App.jsx";

describe("ArenaSphere App Component", () => {
  it("renders the sidebar navigation and default dashboard", async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(screen.getByText(/Live Alerts/i)).toBeInTheDocument();
  });

  it("can navigate to Fan Hub page", async () => {
    await act(async () => {
      render(<App />);
    });
    const fanHubLink = screen.getByRole("button", { name: /Fan Hub/i });
    await act(async () => {
      fireEvent.click(fanHubLink);
    });
    expect(screen.getByRole("heading", { name: /AI Concierge/i })).toBeInTheDocument();
    expect(screen.getByText(/Eco-Challenge/i)).toBeInTheDocument();
  });

  it("can navigate to Ops Command page", async () => {
    await act(async () => {
      render(<App />);
    });
    const opsLink = screen.getByRole("button", { name: /Ops Command/i });
    await act(async () => {
      fireEvent.click(opsLink);
    });
    expect(screen.getByText(/Incident Co-Pilot/i)).toBeInTheDocument();
    expect(screen.getByText(/Broadcast Translator/i)).toBeInTheDocument();
  });
});
