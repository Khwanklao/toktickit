import React, { useState } from "react";
import { checkSystem, Category } from "../api.js";

type UiState = "idle" | "loading" | "success" | "error";

export const CheckSystem: React.FC = () => {
  const [state, setState] = useState<UiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const res = await checkSystem();
      setCategories(res.categories);
      setState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to connect to TokTickIT API";
      setErrorMessage(msg);
      setState("error");
    }
  }

  return (
    <div className="check-system-widget p-3 border rounded surface-card my-3" data-testid="check-system-widget">
      <div className="d-flex align-items-center justify-content-between">
        <span className="fw-semibold">System Diagnostics</span>
        <button
          className="btn btn-sm btn-success"
          onClick={handleCheck}
          disabled={state === "loading"}
        >
          {state === "loading" ? "Loading…" : "Check System"}
        </button>
      </div>

      {state === "loading" && (
        <div className="mt-2 text-muted small">Checking system status...</div>
      )}

      {state === "success" && (
        <div className="mt-3">
          <div className="alert alert-success py-2 mb-2 small" role="alert">
            System Status: Online
          </div>
          <div className="fw-bold small mb-1">Supported Request Categories</div>
          <ul className="list-group list-group-flush small">
            {categories.map((cat) => (
              <li key={cat.id} className="list-group-item py-1">
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-3 py-2 mb-0 small" role="alert">
          <div>System Status: Offline</div>
          <div className="small mt-1">{errorMessage || "Unable to connect to TokTickIT API"}</div>
        </div>
      )}
    </div>
  );
};
