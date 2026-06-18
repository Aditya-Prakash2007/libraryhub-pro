"use client";

import { useEffect } from "react";
import { getUserNotifications } from "@/actions/notifications";
import { useAppStore } from "@/store/use-app-store";

export function useNotificationCount() {
  const { setUnreadNotificationCount } = useAppStore();

  useEffect(() => {
    async function fetchCount() {
      const result = await getUserNotifications();
      if (!("error" in result)) {
        setUnreadNotificationCount(result.unreadCount);
      }
    }

    fetchCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [setUnreadNotificationCount]);
}
