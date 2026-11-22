import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, loadToken, saveToken, setSignedOutHandler } from "./api";
import type { Config } from "./types";

type Auth = {
  ready: boolean;
  signedIn: boolean;
  config: Config | null;
  /** Bumped after sign-in / sign-out and after posting, so screens refetch. */
  version: number;
  refresh: () => void;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setSignedOutHandler(() => { setSignedIn(false); setVersion((v) => v + 1); });
    (async () => {
      const t = await loadToken();
      setSignedIn(Boolean(t));
      setReady(true);
      api.config().then(setConfig).catch(() => {});
    })();
  }, []);

  const signIn = useCallback(async (token: string) => {
    await saveToken(token);
    setSignedIn(true);
    setVersion((v) => v + 1);
  }, []);
  const signOut = useCallback(async () => {
    await saveToken(null);
    setSignedIn(false);
    setVersion((v) => v + 1);
  }, []);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(() => ({ ready, signedIn, config, version, refresh, signIn, signOut }), [ready, signedIn, config, version, refresh, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
