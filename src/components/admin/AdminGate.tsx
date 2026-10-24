"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ADMIN_BASE_PATH } from "@/lib/constants";

type AdminGateProps = { children: ReactNode; forceLogin?: boolean };

export function AdminGate({ children, forceLogin = false }: AdminGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (forceLogin) {
      setIsReady(true);
      return;
    }
    const controller = new AbortController();
    setCheckFailed(false);
    fetch("/api/admin-session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        // A rate limit or server error says nothing about the session, so it
        // must not fall through to the login form.
        if (!response.ok) throw new Error("Session check failed");
        const session = await response.json();
        setIsAuthenticated(session.authenticated === true);
        setIsReady(true);
      })
      .catch(() => {
        // An aborted check belongs to an effect that already ran again.
        if (controller.signal.aborted) return;
        setCheckFailed(true);
        setIsReady(true);
      });
    return () => controller.abort();
  }, [forceLogin, checkAttempt]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to sign in");
      return;
    }
    setPassword("");
    setError("");
    setIsAuthenticated(true);
    if (forceLogin) window.location.assign(ADMIN_BASE_PATH);
  };

  if (!isReady) return null;
  if (checkFailed) {
    return <Layout><section className="py-16 md:py-24"><div className="container max-w-md"><Card><CardHeader><CardTitle>Could not check your session</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">We could not confirm you are signed in. Check your connection and try again.</p><Button className="w-full" type="button" onClick={() => { setIsReady(false); setCheckAttempt((attempt) => attempt + 1); }}>Try again</Button></CardContent></Card></div></section></Layout>;
  }
  if (isAuthenticated) return <>{children}</>;

  return <Layout><section className="py-16 md:py-24"><div className="container max-w-md"><Card><CardHeader><CardTitle>Admin Login</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={handleLogin}><div className="space-y-2"><label className="text-sm font-medium" htmlFor="admin-id">Admin ID</label><Input id="admin-id" value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="Enter admin ID" /></div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="admin-password">Password</label><Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" /></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button className="w-full" type="submit">Login</Button></form></CardContent></Card></div></section></Layout>;
}
