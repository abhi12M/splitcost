"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { LOCAL_GROUPS_KEY, MY_GROUPS_UPDATED_EVENT } from "@/lib/constants";
import { getEncryptedItem } from "@/lib/localStorage";

function readMyGroupsCount(): number {
  const groupIds = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
  return Array.isArray(groupIds) ? groupIds.length : 0;
}

export function useMyGroupsCount(): number {
  const pathname = usePathname();
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" ? readMyGroupsCount() : 0
  );

  const refreshCount = useCallback(() => {
    setCount(readMyGroupsCount());
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount, pathname]);

  useEffect(() => {
    const onStorage = () => {
      refreshCount();
    };

    window.addEventListener("focus", refreshCount);
    window.addEventListener("storage", onStorage);
    window.addEventListener(MY_GROUPS_UPDATED_EVENT, refreshCount);

    return () => {
      window.removeEventListener("focus", refreshCount);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MY_GROUPS_UPDATED_EVENT, refreshCount);
    };
  }, [refreshCount]);

  return count;
}
