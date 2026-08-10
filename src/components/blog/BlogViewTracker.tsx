"use client";

import { useEffect } from "react";

import { ADMIN_SESSION_KEY } from "@/lib/constants";
import { getEncryptedItem } from "@/lib/localStorage";

const SESSION_VIEW_KEY_PREFIX = "sc_blog_view_";

export function BlogViewTracker({ blogId }: { blogId: string }) {
  useEffect(() => {
    if (getEncryptedItem<boolean>(ADMIN_SESSION_KEY, false)) return;

    const sessionKey = `${SESSION_VIEW_KEY_PREFIX}${blogId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const controller = new AbortController();

    fetch(`/api/blogs/${blogId}/views`, {
      method: "POST",
      signal: controller.signal,
      keepalive: true,
    })
      .then((response) => {
        if (response.ok) {
          sessionStorage.setItem(sessionKey, "1");
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [blogId]);

  return null;
}
