"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Bell, Shield, Palette, Save, Info, CreditCard, QrCode } from "lucide-react";
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
import { RazorpaySettings } from "./razorpay-settings";

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
  razorpayKeyId?: string | null;
  razorpaySecret?: string | null;
  hasRazorpaySecret?: boolean;
  upiId?: string | null;
  customQrCode?: string | null;
  settings?: LibrarySettings | null;
}

export function LibrarySettingsPage({ library }: { library: Library | null }) {
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
      upiId: library?.upiId || "",
      customQrCode: library?.customQrCode || "",
    },
  });

  const onSubmit = async (data: LibrarySettingsFormData) => {
    setSaving(true);
    const result = await saveLibrarySettings(data);
    if ("error" in result) toast.error(result.error);
    else toast.success("Settings saved successfully");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your library configuration" />

      <Tabs defaultValue="general">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general"><Building2 className="w-4 h-4 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1.5" />Payments</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="w-4 h-4 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-1.5" />Security</TabsTrigger>
        </TabsList>

        <div className="space-y-6">
          {/* ── General ── */}
          <TabsContent value="general" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Library Information</CardTitle>
                <CardDescription>Basic details about your library</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Library Name *</Label>
                    <Input {...register("name")} className={errors.name ? "border-destructive" : ""} />
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
                  <Textarea {...register("description")} placeholder="Brief description of your library..." rows={3} />
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
                <Button type="button" loading={saving} onClick={handleSubmit(onSubmit)}>
                  <Save className="w-4 h-4 mr-2" />Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Payments / Razorpay & Custom QR ── */}
          <TabsContent value="payments" className="mt-0">
            <div className="space-y-6">
              <RazorpaySettings
                razorpayKeyId={library?.razorpayKeyId}
                hasSecret={library?.hasRazorpaySecret}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-500" />
                    Custom UPI QR / Payment Settings
                  </CardTitle>
                  <CardDescription>
                    Add your UPI ID or a custom payment QR code image link so students can pay you directly via UPI.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>UPI ID (for dynamic QR generation)</Label>
                      <Input
                        placeholder="e.g. libraryname@okaxis"
                        {...register("upiId")}
                      />
                      <p className="text-xs text-muted-foreground">
                        If set, a dynamic UPI QR code will be auto-generated for students to scan.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Custom QR Image URL</Label>
                      <Input
                        placeholder="e.g. https://example.com/your-qr.png"
                        {...register("customQrCode")}
                      />
                      <p className="text-xs text-muted-foreground">
                        Or paste a link to your payment QR code image.
                      </p>
                    </div>
                  </div>

                  <Button type="button" loading={saving} onClick={handleSubmit(onSubmit)}>
                    <Save className="w-4 h-4 mr-2" />
                    Save UPI Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you communicate with students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Email Notifications", desc: "Send notifications via Brevo email", key: "emailNotifications", defaultChecked: library?.settings?.emailNotifications ?? true },
                  { label: "SMS Notifications", desc: "Send SMS (requires Twilio configuration)", key: "smsNotifications", defaultChecked: library?.settings?.smsNotifications ?? false },
                  { label: "WhatsApp Notifications", desc: "Send WhatsApp messages", key: "whatsappNotifications", defaultChecked: library?.settings?.whatsappNotifications ?? false },
                  { label: "Late Fee", desc: "Automatically apply late fee after grace period", key: "lateFeeEnabled", defaultChecked: library?.settings?.lateFeeEnabled ?? true },
                  { label: "QR Check-In", desc: "Allow attendance via QR code scanning", key: "qrCheckInEnabled", defaultChecked: library?.settings?.qrCheckInEnabled ?? true },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
                <Button type="button" loading={saving} onClick={handleSubmit(onSubmit)}>
                  <Save className="w-4 h-4 mr-2" />Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Branding ── */}
          <TabsContent value="branding" className="mt-0">
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
                      <input type="color" {...register("primaryColor")} className="w-12 h-10 rounded-lg cursor-pointer border border-input" />
                      <Input {...register("primaryColor")} className="font-mono text-xs flex-1" placeholder="#6366f1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-3">
                      <input type="color" {...register("secondaryColor")} className="w-12 h-10 rounded-lg cursor-pointer border border-input" />
                      <Input {...register("secondaryColor")} className="font-mono text-xs flex-1" placeholder="#8b5cf6" />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border/50 space-y-3">
                  <p className="text-sm font-medium">Preview</p>
                  <div className="h-12 rounded-lg transition-all duration-300" style={{ background: `linear-gradient(135deg, ${watch("primaryColor") || "#6366f1"}, ${watch("secondaryColor") || "#8b5cf6"})` }} />
                  <div className="flex gap-3">
                    <div className="flex-1 h-8 rounded-md" style={{ background: watch("primaryColor") || "#6366f1" }} />
                    <div className="flex-1 h-8 rounded-md" style={{ background: watch("secondaryColor") || "#8b5cf6" }} />
                  </div>
                </div>
                <Button type="button" loading={saving} onClick={handleSubmit(onSubmit)}>
                  <Save className="w-4 h-4 mr-2" />Save Branding
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Security ── */}
          <TabsContent value="security" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage authentication and access control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Info className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Advanced security settings are managed at the platform level. Contact support for enterprise features.
                  </p>
                </div>
                {[
                  { label: "Two-Factor Authentication", desc: "Require OTP verification for admin login", enabled: false },
                  { label: "Session Timeout", desc: "Auto-logout after 30 days of inactivity", enabled: true },
                  { label: "Activity Logging", desc: "Log all admin actions for security audit", enabled: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
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
        </div>
      </Tabs>
    </div>
  );
}
