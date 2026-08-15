import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
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
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <div className="mt-3 text-muted">Checking system status...</div>
      )}

      {state === "success" && (
        <>
          <div className="alert alert-success mt-3" role="alert">
            System Status: Online
          </div>
          <div className="mt-4">
            <h2 className="h5 mb-3">Supported Request Categories</h2>
            <ul className="list-group">
              {categories.map((cat) => (
                <li key={cat.id} className="list-group-item">
                  {cat.name}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-3" role="alert">
          <div>System Status: Offline</div>
          <div className="small mt-1">{errorMessage || "Unable to connect to TokTickIT API"}</div>
        </div>
      )}
    </div>
  );
}
