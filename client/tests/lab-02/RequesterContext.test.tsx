import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import { apiClient, REQUESTER_STORAGE_KEY } from "../../src/lib/apiClient.js";

const mockRequesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Engineering" },
  { id: 2, name: "Michael Brown", email: "michael.brown@example.com", department: "Finance" },
];

function TestChildComponent() {
  const { currentRequester, switchRequester } = useRequester();
  const [localSearch, setLocalSearch] = useState("initial-search-query");

  return (
    <div>
      <div data-testid="active-requester-name">
        {currentRequester ? currentRequester.name : "None"}
      </div>
      <input
        data-testid="local-search-input"
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
      />
      <button data-testid="switch-to-2" onClick={() => switchRequester(2)}>
        Switch to 2
      </button>
    </div>
  );
}

function TestParentKeyWrapper() {
  const { currentRequester } = useRequester();
  // Keying TestChildComponent on currentRequester?.id unmounts/remounts child on switch (BR-14)
  return <TestChildComponent key={currentRequester?.id} />;
}

describe("RequesterContext & apiClient Unit Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches active requesters on mount and reads stored requester ID from localStorage", async () => {
    localStorage.setItem(REQUESTER_STORAGE_KEY, "2");
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }))
    );

    render(
      <RequesterProvider>
        <TestParentKeyWrapper />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-requester-name")).toHaveTextContent("Michael Brown");
    });
  });

  it("attaches x-requester-id header to outgoing apiClient requests when requester is selected, and omits it when none selected", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );

    // 1. Without requester selected
    localStorage.clear();
    await apiClient.get("/api/tickets");
    let lastCall = fetchSpy.mock.calls[0];
    let headers = lastCall[1]?.headers as Record<string, string>;
    expect(headers?.["x-requester-id"]).toBeUndefined();

    // 2. With requester selected
    localStorage.setItem(REQUESTER_STORAGE_KEY, "1");
    await apiClient.get("/api/tickets");
    lastCall = fetchSpy.mock.calls[1];
    headers = lastCall[1]?.headers as Record<string, string>;
    expect(headers["x-requester-id"]).toBe("1");
  });

  it("resets local component state when switching requester via key-based remount (BR-14 groundwork)", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }))
    );

    render(
      <RequesterProvider>
        <TestParentKeyWrapper />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-requester-name")).toBeInTheDocument();
    });

    const input = screen.getByTestId("local-search-input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "custom-dirty-search");
    expect(input.value).toBe("custom-dirty-search");

    // Switch requester
    await user.click(screen.getByTestId("switch-to-2"));

    await waitFor(() => {
      expect(screen.getByTestId("active-requester-name")).toHaveTextContent("Michael Brown");
    });

    // Key-based remount resets input back to its initial state
    const newFileInput = screen.getByTestId("local-search-input") as HTMLInputElement;
    expect(newFileInput.value).toBe("initial-search-query");
  });
});
