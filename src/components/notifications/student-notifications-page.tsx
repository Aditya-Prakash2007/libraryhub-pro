"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, BellOff } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import { getRelativeTime } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

const typeIcon: Record<string, string> = {
  ANNOUNCEMENT: "📢",
  FEE_DUE: "💰",
  FEE_OVERDUE: "⚠️",
  PAYMENT_SUCCESS: "✅",
  REMINDER: "⏰",
  SYSTEM: "⚙️",
  ATTENDANCE_ALERT: "📋",
};

export function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadNotificationCount } = useAppStore();

  async function loadNotifications() {
    setLoading(true);
    const result = await getUserNotifications();
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setNotifications(result.notifications as Notification[]);
      setUnreadNotificationCount(result.unreadCount);
    }
    setLoading(false);
  }

  useEffect(() => { loadNotifications(); }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadNotificationCount(Math.max(0, notifications.filter((n) => !n.isRead).length - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationCount(0);
    toast.success("All notifications marked as read");
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description={`${unreadCount} unread`}>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-20" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <BellOff className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm text-muted-foreground">Notifications from your library will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                  !n.isRead ? "border-indigo-500/30 bg-indigo-500/5" : ""
                }`}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{typeIcon[n.type] || "🔔"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{getRelativeTime(n.createdAt)}</span>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
