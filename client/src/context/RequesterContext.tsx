import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Requester, RequesterStatus } from "../types/index.js";
import { apiFetch, getStoredRequesterId, setStoredRequesterId } from "../lib/apiClient.js";

interface RequesterContextType {
  currentRequester: Requester | null;
  requesters: Requester[];
  status: RequesterStatus;
  error: string | null;
  switchRequester: (id: number) => void;
  clearRequester: () => void;
  fetchRequesters: () => Promise<void>;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [status, setStatus] = useState<RequesterStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchRequesters = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await apiFetch("/api/dev/requesters");
      if (!res.ok) {
        throw new Error("Failed to fetch development requesters.");
      }
      const data: Requester[] = await res.json();
      setRequesters(data);
      setStatus("success");

      // Check stored requester ID in localStorage
      const storedId = getStoredRequesterId();
      if (storedId) {
        const found = data.find((r) => String(r.id) === String(storedId));
        if (found) {
          setCurrentRequester(found);
        } else {
          // Stored ID is no longer active or valid
          setStoredRequesterId(null);
          setCurrentRequester(null);
        }
      }
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while fetching requesters.";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    fetchRequesters();
  }, [fetchRequesters]);

  const switchRequester = useCallback(
    (id: number) => {
      const target = requesters.find((r) => r.id === id);
      if (target) {
        setCurrentRequester(target);
        setStoredRequesterId(id);
      }
    },
    [requesters]
  );

  const clearRequester = useCallback(() => {
    setCurrentRequester(null);
    setStoredRequesterId(null);
  }, []);

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        requesters,
        status,
        error,
        switchRequester,
        clearRequester,
        fetchRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
