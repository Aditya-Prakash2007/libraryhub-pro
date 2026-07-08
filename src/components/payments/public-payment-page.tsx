"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CreditCard, Search, BookOpen, CheckCircle2, Phone, QrCode, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createRazorpayOrder, verifyPayment } from "@/actions/payments";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_TYPES } from "@/constants";
import { generateQRCode } from "@/lib/qrcode";

interface Library {
  id: string;
  name: string;
  logo?: string | null;
  primaryColor?: string | null;
  razorpayKeyId?: string | null;
  upiId?: string | null;
  customQrCode?: string | null;
}

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  phone: string;
  monthlyFee: number;
  discountAmount?: number | null;
  paymentStatus: string;
  totalDueAmount: number;
  seat?: { seatNumber: string } | null;
  shift?: { name: string } | null;
}

export function PublicPaymentPage({ library }: { library: Library }) {
  const [phone, setPhone] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [searching, setSearching] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [upiMonths, setUpiMonths] = useState<number>(1);
  const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const primaryColor = library.primaryColor || "#6366f1";
  
  // Calculate actual fee (which is passed in search already adjusted, but let's be safe)
  const actualFee = student ? Math.max(0, student.monthlyFee - (student.discountAmount || 0)) : 0;
  const upiAmount = actualFee * upiMonths;

  // Generate dynamic UPI QR Code
  useEffect(() => {
    if (!library.upiId || !student) return;
    setGeneratingQr(true);
    const upiString = `upi://pay?pa=${library.upiId}&pn=${encodeURIComponent(library.name)}&am=${upiAmount}&cu=INR`;
    generateQRCode(upiString)
      .then(setUpiQrUrl)
      .catch((e) => {
        console.error("Error generating UPI QR code:", e);
        toast.error("Failed to generate UPI QR code");
      })
      .finally(() => setGeneratingQr(false));
  }, [library, student, upiAmount]);

  const handleSearch = async () => {
    if (!phone.trim() || phone.length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/student/by-phone?phone=${phone}&libraryId=${library.id}`);
      const data = await res.json();
      if (data.student) {
        setStudent(data.student);
      } else {
        toast.error("No student found with this phone number in this library");
        setStudent(null);
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handlePay = async (months: number, paymentType: string) => {
    if (!student) return;
    const amount = actualFee * months;
    setPaying(paymentType);

    try {
      const orderResult = await createRazorpayOrder({
        studentId: student.id,
        amount,
        paymentType,
        description: `${library.name} — ${paymentType.replace("_", " ")} Fee`,
      });

      if ("error" in orderResult) {
        toast.error(orderResult.error);
        setPaying(null);
        return;
      }

      await openRazorpayCheckout({
        key: orderResult.key!,
        amount: amount * 100,
        currency: "INR",
        name: library.name,
        description: `${paymentType.replace("_", " ")} Fee`,
        order_id: orderResult.orderId!,
        prefill: { name: student.fullName, contact: student.phone },
        theme: { color: primaryColor },
        handler: async (response) => {
          const verify = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            paymentDbId: orderResult.paymentId!,
          });
          if ("success" in verify && verify.success) {
            setPaid(true);
            toast.success("🎉 Payment successful!");
          } else {
            toast.error("Payment verification failed. Contact library.");
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      });
    } catch {
      toast.error("Payment failed. Please try again.");
      setPaying(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("UPI ID copied!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-2 w-full" style={{ background: `linear-gradient(to right, ${primaryColor}, #8b5cf6)` }} />

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Library header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${primaryColor}20` }}>
            {library.logo ? (
              <img src={library.logo} alt={library.name} className="w-10 h-10 object-contain" />
            ) : (
              <BookOpen className="w-8 h-8" style={{ color: primaryColor }} />
            )}
          </div>
          <h1 className="text-2xl font-bold">{library.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Pay your library fees online</p>
        </div>

        {paid ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-4"
          >
            <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-muted-foreground">
              Your fee has been paid to {library.name}. Check your email for receipt.
            </p>
            <Button variant="outline" onClick={() => { setPaid(false); setStudent(null); setPhone(""); }}>
              Pay Again
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Phone search */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="font-semibold text-sm">Enter your registered phone number</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleSearch} loading={searching} disabled={phone.length < 10}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Student info + payment */}
            {student && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Student card */}
                <Card style={{ borderColor: `${primaryColor}40` }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)` }}>
                        {student.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground">{student.studentId}</p>
                      </div>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${student.paymentStatus === "PAID" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
                        {student.paymentStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-muted-foreground">Seat</p>
                        <p className="font-semibold">{student.seat?.seatNumber ?? "—"}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-muted-foreground">Shift</p>
                        <p className="font-semibold">{student.shift?.name ?? "—"}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-muted-foreground">Monthly</p>
                        <p className="font-semibold">₹{actualFee}</p>
                      </div>
                    </div>
                    {student.totalDueAmount > 0 && (
                      <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 text-center font-medium">
                        ⚠️ Balance due: {formatCurrency(student.totalDueAmount)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Choose Payment Method Tabs */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <Tabs defaultValue="online" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="online">Online Payment</TabsTrigger>
                        <TabsTrigger value="upi" disabled={!library.upiId && !library.customQrCode}>
                          Direct UPI QR
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="online" className="space-y-3 mt-0">
                        {PAYMENT_TYPES.map((type) => {
                          const amount = actualFee * type.months;
                          return (
                            <button
                              key={type.value}
                              onClick={() => handlePay(type.months, type.value)}
                              disabled={!!paying}
                              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left disabled:opacity-60"
                            >
                              <div>
                                <p className="font-semibold text-sm">{type.label}</p>
                                <p className="text-xs text-muted-foreground">{type.months} month{type.months > 1 ? "s" : ""}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg" style={{ color: primaryColor }}>
                                  {formatCurrency(amount)}
                                </p>
                                {paying === type.value && (
                                  <p className="text-xs text-muted-foreground">Processing...</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        <p className="text-center text-xs text-muted-foreground mt-2">
                          🔒 Secure payment via Razorpay
                        </p>
                      </TabsContent>

                      <TabsContent value="upi" className="space-y-4 mt-0">
                        <div className="flex flex-col items-center justify-center py-2 space-y-4">
                          <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-md">
                            {generatingQr ? (
                              <div className="w-40 h-40 flex items-center justify-center">
                                <QrCode className="w-8 h-8 text-muted-foreground animate-pulse" />
                              </div>
                            ) : library.customQrCode ? (
                              <div className="text-center space-y-2">
                                <img src={library.customQrCode} alt="Custom Payment QR" className="max-w-[200px] max-h-[200px] object-contain mx-auto rounded-lg" />
                                <p className="text-[10px] text-muted-foreground font-medium">Scan to pay library (Custom QR)</p>
                              </div>
                            ) : upiQrUrl && library.upiId ? (
                              <div className="text-center space-y-2">
                                <img src={upiQrUrl} alt="UPI Payment QR" className="w-40 h-40 mx-auto" />
                                <p className="text-[10px] text-muted-foreground font-mono">Dynamic QR for ₹{upiAmount}</p>
                              </div>
                            ) : null}
                          </div>

                          {library.upiId && (
                            <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/50 text-xs">
                              <span className="font-mono text-muted-foreground">UPI: {library.upiId}</span>
                              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => copyToClipboard(library.upiId!)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          )}

                          <div className="w-full space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Select Duration</Label>
                              <div className="grid grid-cols-4 gap-2">
                                {[1, 3, 6, 12].map((m) => (
                                  <Button
                                    key={m}
                                    variant={upiMonths === m ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setUpiMonths(m)}
                                    className="text-xs font-semibold"
                                  >
                                    {m} M{m > 1 ? "s" : ""}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-xs space-y-1.5">
                              <div className="flex justify-between border-b border-border/50 pb-1 mb-1 font-semibold">
                                <span>Total Amount:</span>
                                <span style={{ color: primaryColor }}>{formatCurrency(upiAmount)}</span>
                              </div>
                              <p className="font-semibold text-muted-foreground">Instructions:</p>
                              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                                <li>Scan QR using GPay, PhonePe, Paytm, etc.</li>
                                <li>Pay the exact amount: <strong>{formatCurrency(upiAmount)}</strong>.</li>
                                <li>Take a screenshot of the payment receipt.</li>
                                <li>Inform the admin with your Transaction ID to mark it paid.</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
