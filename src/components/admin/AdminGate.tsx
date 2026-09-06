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
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (forceLogin) {
      setIsReady(true);
      return;
    }
    const controller = new AbortController();
    fetch("/api/admin-session", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((session) => setIsAuthenticated(session.authenticated === true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsReady(true));
    return () => controller.abort();
  }, [forceLogin]);

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
  if (isAuthenticated) return <>{children}</>;

  return <Layout><section className="py-16 md:py-24"><div className="container max-w-md"><Card><CardHeader><CardTitle>Admin Login</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={handleLogin}><div className="space-y-2"><label className="text-sm font-medium" htmlFor="admin-id">Admin ID</label><Input id="admin-id" value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="Enter admin ID" /></div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="admin-password">Password</label><Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" /></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button className="w-full" type="submit">Login</Button></form></CardContent></Card></div></section></Layout>;
}
