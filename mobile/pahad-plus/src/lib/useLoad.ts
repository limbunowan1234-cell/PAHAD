import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth";

type State<T> = { key: string | null; data: T | null; error: string };

/** Loads data from pahad.org; reloads when sign-in changes, on pull-to-refresh, or when deps change. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const { version } = useAuth();
  const key = `${version}|${JSON.stringify(deps)}`;
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  useEffect(() => {
    let alive = true;
    fnRef.current().then(
      (data) => { if (alive) setState({ key, data, error: "" }); },
      (e: unknown) => { if (alive) setState((s) => ({ key, data: s.data, error: e instanceof Error ? e.message : "Something went wrong." })); },
    ).finally(() => { if (alive) setRefreshing(false); });
    return () => { alive = false; };
  }, [key, nonce]);

  const setData = useCallback((next: T | null | ((d: T | null) => T | null)) => {
    setState((s) => ({ ...s, data: typeof next === "function" ? (next as (d: T | null) => T | null)(s.data) : next }));
  }, []);

  return {
    data: state.data,
    setData,
    error: state.error,
    /** True until the first answer for the current filters arrives. */
    loading: state.key !== key,
    refreshing,
    reload: () => setNonce((n) => n + 1),
    refresh: () => { setRefreshing(true); setNonce((n) => n + 1); },
  };
}
