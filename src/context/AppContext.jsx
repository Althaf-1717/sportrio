import React, { createContext, useContext, useState, useEffect } from "react";
import { LocalRepository } from "../services/repository";
import { Academy } from "../services/academy";
import { HttpAcademy } from "../services/httpAcademy";
export const api = import.meta.env.VITE_API_URL
  ? new HttpAcademy(import.meta.env.VITE_API_URL)
  : new Academy(new LocalRepository(localStorage), sessionStorage);
export const AppContext = createContext();
const Context = AppContext;
export function AppProvider({ children }) {
  const [data, setData] = useState(null),
    [user, setUser] = useState(null),
    [toast, setToast] = useState(null),
    [error, setError] = useState("");
  const refresh = () => {
    setData(api.snapshot());
    setUser(api.session());
  };
  useEffect(() => {
    api
      .initialize()
      .then(refresh)
      .catch((e) => setError(e.message));
    const update = () => refresh();
    window.addEventListener("storage", update);
    const timer = setInterval(update, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const run = async (fn, message) => {
    try {
      const r = await fn();
      refresh();
      if (message) setToast({ text: message });
      return r;
    } catch (e) {
      setToast({ text: e.message, error: true });
      throw e;
    }
  };
  if (error)
    return (
      <main className="container page">
        <h1>Unable to open Sportivo</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!data)
    return (
      <div className="loading" role="status">
        Getting your academy ready…
      </div>
    );
  return (
    <Context.Provider
      value={{ data, user, run, refresh, notify: (text) => setToast({ text }) }}
    >
      {children}
      {toast && (
        <div
          className={"toast " + (toast.error ? "error" : "")}
          role={toast.error ? "alert" : "status"}
        >
          {toast.text}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
