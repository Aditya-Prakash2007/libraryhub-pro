"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Bell, Shield, Palette, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { librarySettingsSchema } from "@/schemas";
import type { LibrarySettingsFormData } from "@/schemas";
import { saveLibrarySettings } from "@/actions/library";

interface LibrarySettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
  qrCheckInEnabled: boolean;
}

interface Library {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  openingTime: string;
  closingTime: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  timezone: string;
  settings?: LibrarySettings | null;
}

interface LibrarySettingsPageProps {
  library: Library | null;
}

export function LibrarySettingsPage({ library }: LibrarySettingsPageProps) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LibrarySettingsFormData>({
    resolver: zodResolver(librarySettingsSchema) as import("react-hook-form").Resolver<LibrarySettingsFormData>,
    defaultValues: {
      name: library?.name || "",
      description: library?.description || "",
      address: library?.address || "",
      city: library?.city || "",
      state: library?.state || "",
      pincode: library?.pincode || "",
      phone: library?.phone || "",
      email: library?.email || "",
      website: library?.website || "",
      openingTime: library?.openingTime || "06:00",
      closingTime: library?.closingTime || "22:00",
      primaryColor: library?.primaryColor || "#6366f1",
      secondaryColor: library?.secondaryColor || "#8b5cf6",
      currency: library?.currency || "INR",
      timezone: library?.timezone || "Asia/Kolkata",
    },
  });

  const onSubmit = async (data: LibrarySettingsFormData) => {
    setSaving(true);
    const result = await saveLibrarySettings(data);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Settings saved successfully");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your library configuration" />

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">
            <Building2 className="w-4 h-4 mr-1.5" />General
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-1.5" />Notifications
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-1.5" />Branding
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-1.5" />Security
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Library Information</CardTitle>
                <CardDescription>Basic details about your library</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Library Name *</Label>
                    <Input
                      {...register("name")}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input {...register("phone")} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input {...register("email")} type="email" placeholder="library@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input {...register("website")} placeholder="https://yourlibrary.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Opening Time</Label>
                    <Input {...register("openingTime")} type="time" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Closing Time</Label>
                    <Input {...register("closingTime")} type="time" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Input {...register("currency")} placeholder="INR" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Input {...register("timezone")} placeholder="Asia/Kolkata" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    {...register("description")}
                    placeholder="Brief description of your library..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input {...register("city")} placeholder="Mumbai" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Input {...register("state")} placeholder="Maharashtra" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pincode</Label>
                    <Input {...register("pincode")} placeholder="400001" />
                  </div>
                </div>
                <Button type="submit" loading={saving}>
                  <Save className="w-4 h-4" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you communicate with students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Email Notifications",
                    desc: "Send notifications via email (requires Resend API key)",
                    defaultChecked: library?.settings?.emailNotifications ?? true,
                  },
                  {
                    label: "SMS Notifications",
                    desc: "Send SMS to students (requires Twilio configuration)",
                    defaultChecked: library?.settings?.smsNotifications ?? false,
                  },
                  {
                    label: "WhatsApp Notifications",
                    desc: "Send WhatsApp messages (requires WhatsApp Business API)",
                    defaultChecked: library?.settings?.whatsappNotifications ?? false,
                  },
                  {
                    label: "Late Fee",
                    desc: "Automatically apply late fee after grace period expires",
                    defaultChecked: library?.settings?.lateFeeEnabled ?? true,
                  },
                  {
                    label: "QR Check-In",
                    desc: "Allow students to check in via QR code scanning",
                    defaultChecked: library?.settings?.qrCheckInEnabled ?? true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
                <Button type="button" loading={saving} onClick={handleSubmit(onSubmit)}>
                  <Save className="w-4 h-4" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Library Branding</CardTitle>
                <CardDescription>Customize your library colors and theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        {...register("primaryColor")}
                        className="w-12 h-10 rounded-lg cursor-pointer border border-input"
                      />
                      <Input
                        {...register("primaryColor")}
                        className="font-mono text-xs flex-1"
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        {...register("secondaryColor")}
                        className="w-12 h-10 rounded-lg cursor-pointer border border-input"
                      />
                      <Input
                        {...register("secondaryColor")}
                        className="font-mono text-xs flex-1"
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl border border-border/50 space-y-3">
                  <p className="text-sm font-medium">Color Preview</p>
                  <div
                    className="h-12 rounded-lg transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${watch("primaryColor") || "#6366f1"}, ${watch("secondaryColor") || "#8b5cf6"})`,
                    }}
                  />
                  <div className="flex gap-3">
                    <div
                      className="flex-1 h-8 rounded-md"
                      style={{ background: watch("primaryColor") || "#6366f1" }}
                    />
                    <div
                      className="flex-1 h-8 rounded-md"
                      style={{ background: watch("secondaryColor") || "#8b5cf6" }}
                    />
                  </div>
                </div>

                <Button type="submit" loading={saving}>
                  <Save className="w-4 h-4" />
                  Save Branding
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage authentication and access control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Info className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Advanced security settings are managed at the platform level. Contact support to enable enterprise security features.
                  </p>
                </div>
                {[
                  {
                    label: "Two-Factor Authentication",
                    desc: "Require OTP verification for admin login",
                    enabled: false,
                  },
                  {
                    label: "Session Timeout",
                    desc: "Auto-logout after 30 minutes of inactivity",
                    enabled: true,
                  },
                  {
                    label: "Activity Logging",
                    desc: "Log all admin actions for security auditing",
                    enabled: true,
                  },
                  {
                    label: "IP Whitelist",
                    desc: "Restrict admin access to specific IP addresses",
                    enabled: false,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}
