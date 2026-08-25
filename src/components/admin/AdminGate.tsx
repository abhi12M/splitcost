"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ADMIN_SESSION_KEY,
} from "@/lib/constants";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";

type AdminGateProps = {
  children: ReactNode;
  /** The standalone login route must always render the form. */
  forceLogin?: boolean;
};

export function AdminGate({ children, forceLogin = false }: AdminGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const hasSession = forceLogin
      ? false
      : getEncryptedItem<boolean>(ADMIN_SESSION_KEY, false);
    setIsAuthenticated(hasSession);
    setIsReady(true);
  }, [forceLogin]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ loginId: loginId.trim(), password }),
      });
      if (!response.ok) {
        setError("Invalid admin credentials");
        return;
      }
      // The HTTP-only cookie is the real credential; this is UI state only.
      setEncryptedItem(ADMIN_SESSION_KEY, true);
      setError("");
      setIsAuthenticated(true);
      window.location.assign("/portal/x7k2p9");
    } catch {
      setError("Unable to sign in. Please try again.");
    }
  };

  if (!isReady) {
    return null;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="admin-id">
                    Admin ID
                  </label>
                  <Input
                    id="admin-id"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    placeholder="Enter admin ID"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="admin-password">
                    Password
                  </label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Button className="w-full" type="submit">
                  Login
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
