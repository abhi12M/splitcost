"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  editExpense,
  getGroup,
  loadGroupDetails,
  type EditExpenseInterface,
  type GroupDashboardInterface,
  type GroupResponse,
} from "@/lib/storage";

function useResource<T>(key: string, load: (id: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(key));
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!key) {
      setData(null);
      setLoading(false);
      return null;
    }

    const currentRequestId = ++requestId.current;
    setLoading(true);
    try {
      const next = await load(key);
      if (currentRequestId === requestId.current) setData(next);
      return next;
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [key, load]);

  useEffect(() => {
    setData(null);
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  return { data, loading, refresh, setData };
}

export function useGroupDashboard(groupId: string) {
  return useResource<GroupDashboardInterface | null>(groupId, loadGroupDetails);
}

export function useGroup(groupId: string) {
  return useResource<GroupResponse | null>(groupId, getGroup);
}

export function useExpense(expenseId: string) {
  return useResource<EditExpenseInterface | null>(expenseId, editExpense);
}
