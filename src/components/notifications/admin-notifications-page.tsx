"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Bell, Megaphone, Clock, CheckCircle2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { sendNotification, sendFeeReminders } from "@/actions/notifications";
import { sendBulkFeeReminders } from "@/actions/fees";
import { notificationSchema } from "@/schemas";
import type { NotificationFormData } from "@/schemas";

export function AdminNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [bulkReminderLoading, setBulkReminderLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema) as import("react-hook-form").Resolver<NotificationFormData>,
    defaultValues: { type: "ANNOUNCEMENT", targetAll: true },
  });

  const targetAll = watch("targetAll");

  const onSubmit = async (data: NotificationFormData) => {
    setLoading(true);
    const result = await sendNotification(data);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Notification sent to ${result.count} students`);
      setSent(true);
      reset({ type: "ANNOUNCEMENT", targetAll: true });
      setTimeout(() => setSent(false), 3000);
    }
    setLoading(false);
  };

  const handleSendFeeReminders = async () => {
    setReminderLoading(true);
    const result = await sendFeeReminders();
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Fee reminders sent to ${result.sent} students`);
    }
    setReminderLoading(false);
  };

  const handleBulkEmailReminders = async () => {
    setBulkReminderLoading(true);
    const result = await sendBulkFeeReminders();
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(
        `📧 Emails sent to ${result.sent} student(s). ${result.skipped > 0 ? `${result.skipped} skipped (no email).` : ""}`,
        { duration: 6000 }
      );
    }
    setBulkReminderLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Send announcements and manage alerts" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send notification form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>Broadcast to all or selected students</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Notification Type</Label>
                  <Select onValueChange={(v) => setValue("type", v as NotificationFormData["type"])} defaultValue="ANNOUNCEMENT">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANNOUNCEMENT">📢 Announcement</SelectItem>
                      <SelectItem value="REMINDER">⏰ Reminder</SelectItem>
                      <SelectItem value="FEE_DUE">💰 Fee Due</SelectItem>
                      <SelectItem value="SYSTEM">⚙️ System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g. Library Closed on Sunday"
                    {...register("title")}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Message *</Label>
                  <Textarea
                    placeholder="Write your notification message..."
                    rows={4}
                    {...register("message")}
                    className={errors.message ? "border-destructive" : ""}
                  />
                  {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div>
                    <p className="text-sm font-medium">Send to all active students</p>
                    <p className="text-xs text-muted-foreground">Toggle off to select specific students</p>
                  </div>
                  <Switch
                    checked={targetAll}
                    onCheckedChange={(v) => setValue("targetAll", v)}
                  />
                </div>

                <Button type="submit" className="w-full" loading={loading} disabled={sent}>
                  {sent ? (
                    <><CheckCircle2 className="w-4 h-4" /> Sent Successfully!</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Notification</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Automated Reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Fee Due Reminders</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Auto-send to students with fees due in 7, 3, 1 days
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendFeeReminders}
                      loading={reminderLoading}
                    >
                      Send Now
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-400">Bulk Email Reminders</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      Send fee reminder emails to <strong>all pending, overdue &amp; partial</strong> students at once.
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Partial payments get a separate "balance due" email.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleBulkEmailReminders}
                      loading={bulkReminderLoading}
                      className="bg-indigo-600 text-white hover:bg-indigo-700 w-full"
                    >
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Send to All Pending
                    </Button>
                  </div>
                </div>
              </div>

              {[
                { icon: Bell, label: "Attendance Alerts", desc: "Students below 75% attendance", color: "text-rose-500 bg-rose-500/10" },
                { icon: Megaphone, label: "Monthly Report", desc: "Send monthly summary to all students", color: "text-indigo-500 bg-indigo-500/10" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg border border-border/50 opacity-60">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color.split(" ")[1]}`}>
                      <item.icon className={`w-4 h-4 ${item.color.split(" ")[0]}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                      <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "In-App", enabled: true },
                  { label: "Email", enabled: false },
                  { label: "SMS", enabled: false },
                  { label: "WhatsApp", enabled: false },
                ].map((channel) => (
                  <div key={channel.label} className="flex items-center justify-between">
                    <span className="text-sm">{channel.label}</span>
                    <Switch checked={channel.enabled} disabled={!channel.enabled} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Configure email/SMS in Settings
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
