const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) {
      throw new Error("Unable to connect to TokTickIT API");
    }
    const categoriesRes = await fetch(`${API_URL}/api/categories`);
    if (!categoriesRes.ok) {
      throw new Error("Unable to connect to TokTickIT API");
    }
    const categories = (await categoriesRes.json()) as Category[];
    return { online: true, categories };
  } catch (error) {
    if (error instanceof Error && error.message !== "Unable to connect to TokTickIT API") {
      throw new Error("Unable to connect to TokTickIT API");
    }
    throw error;
  }
}
