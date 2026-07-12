import { render, screen } from "@testing-library/react";
import App from "../App.jsx";

describe("ArenaSphere App Component", () => {
  it("renders the sidebar navigation", () => {
    render(<App />);
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
  });

  it("renders the dashboard by default", () => {
    render(<App />);
    expect(screen.getByText(/Live Alerts/i)).toBeInTheDocument();
  });

  it("has a mobile menu button", () => {
    render(<App />);
    expect(screen.getByLabelText(/Toggle navigation menu/i)).toBeInTheDocument();
  });
});
