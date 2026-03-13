"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ADMIN_LOGIN_ID,
  ADMIN_LOGIN_PASSWORD,
  ADMIN_SESSION_KEY,
} from "@/lib/constants";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";

type AdminGateProps = {
  children: ReactNode;
};

export function AdminGate({ children }: AdminGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const hasSession = getEncryptedItem<boolean>(ADMIN_SESSION_KEY, false);
    setIsAuthenticated(hasSession);
    setIsReady(true);
  }, []);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      loginId.trim() !== ADMIN_LOGIN_ID ||
      password !== ADMIN_LOGIN_PASSWORD
    ) {
      setError("Invalid admin credentials");
      return;
    }

    setEncryptedItem(ADMIN_SESSION_KEY, true);
    setError("");
    setIsAuthenticated(true);
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
