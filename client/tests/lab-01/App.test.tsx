import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    const mockCategories = [
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ];
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: mockCategories,
    });

    render(<App />);
    const button = screen.getByRole("button", { name: /Check System/i });
    await userEvent.click(button);

    expect(screen.getByText(/System Status: Online/i)).toBeInTheDocument();
    expect(screen.getByText(/Supported Request Categories/i)).toBeInTheDocument();
    for (const cat of mockCategories) {
      expect(screen.getByText(cat.name)).toBeInTheDocument();
    }
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Unable to connect to TokTickIT API")
    );

    render(<App />);
    const button = screen.getByRole("button", { name: /Check System/i });
    await userEvent.click(button);

    expect(screen.getByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
