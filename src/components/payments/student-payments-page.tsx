"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CreditCard, Download, CheckCircle2, Clock, AlertCircle, QrCode, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, daysUntilExpiry } from "@/lib/utils";
import { createRazorpayOrder, verifyPayment } from "@/actions/payments";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { PAYMENT_TYPES } from "@/constants";
import { generateQRCode } from "@/lib/qrcode";

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  totalAmount: number;
  paymentType: string;
  paymentMode: string;
  status: string;
  lateFee?: number | null;
  paidAt?: Date | null;
  createdAt: Date;
  invoice?: { invoiceNumber: string; pdfUrl?: string | null } | null;
}

interface StudentPaymentsPageProps {
  payments: Payment[];
  student: {
    id: string;
    fullName: string;
    monthlyFee: number;
    discountAmount?: number | null;
    paymentStatus: string;
    expiryDate?: Date | null;
    libraryId: string;
    library?: {
      name: string;
      upiId?: string | null;
      customQrCode?: string | null;
      primaryColor?: string | null;
    } | null;
  } | null;
}

export function StudentPaymentsPage({ payments, student }: StudentPaymentsPageProps) {
  const [payingType, setPayingType] = useState<string | null>(null);
  const [upiMonths, setUpiMonths] = useState<number>(1);
  const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const daysLeft = student?.expiryDate ? daysUntilExpiry(student.expiryDate) : null;
  const actualFee = student ? Math.max(0, student.monthlyFee - (student.discountAmount || 0)) : 0;
  const upiAmount = actualFee * upiMonths;

  // Generate dynamic UPI QR Code
  useEffect(() => {
    if (!student?.library?.upiId) return;
    setGeneratingQr(true);
    const upiString = `upi://pay?pa=${student.library.upiId}&pn=${encodeURIComponent(student.library.name)}&am=${upiAmount}&cu=INR`;
    generateQRCode(upiString)
      .then(setUpiQrUrl)
      .catch((e) => {
        console.error("Error generating UPI QR code:", e);
        toast.error("Failed to generate UPI QR code");
      })
      .finally(() => setGeneratingQr(false));
  }, [student, upiAmount]);

  const handlePay = async (paymentType: string, months: number) => {
    if (!student) return;
    const amount = actualFee * months;
    setPayingType(paymentType);

    try {
      const orderResult = await createRazorpayOrder({
        studentId: student.id,
        amount,
        paymentType,
        description: `${paymentType.replace("_", " ")} Fee`,
      });

      if ("error" in orderResult) {
        toast.error(orderResult.error);
        setPayingType(null);
        return;
      }

      await openRazorpayCheckout({
        key: orderResult.key!,
        amount: amount * 100,
        currency: "INR",
        name: orderResult.libraryName || student.library?.name || "LibraryHub Pro",
        description: `${paymentType.replace("_", " ")} Fee`,
        order_id: orderResult.orderId!,
        prefill: {
          name: student.fullName,
          contact: "",
        },
        theme: { color: student.library?.primaryColor || "#6366f1" },
        handler: async (response) => {
          const verifyResult = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            paymentDbId: orderResult.paymentId!,
          });

          if ("error" in verifyResult) {
            toast.error("Payment verification failed. Contact support.");
          } else {
            toast.success("Payment successful! 🎉");
            window.location.reload();
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled");
            setPayingType(null);
          },
        },
      });
    } catch (error) {
      toast.error("Payment failed. Please try again.");
      setPayingType(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("UPI ID copied!");
  };

  const statusIcon = (status: string) => {
    if (status === "PAID") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "PENDING" || status === "PARTIAL") return <Clock className="w-4 h-4 text-amber-500" />;
    return <AlertCircle className="w-4 h-4 text-rose-500" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Payments" description="Manage your library fees and invoices" />

      {/* Current status */}
      {student && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Monthly Fee",
              value: formatCurrency(actualFee),
              sub: student.discountAmount && student.discountAmount > 0 
                ? `Base: ${formatCurrency(student.monthlyFee)} (Discount: ${formatCurrency(student.discountAmount)})`
                : "Per month",
              color: "from-indigo-500 to-violet-600",
            },
            {
              label: "Expiry Date",
              value: student.expiryDate ? formatDate(student.expiryDate) : "N/A",
              sub: daysLeft !== null ? `${daysLeft > 0 ? `${daysLeft} days left` : "Expired"}` : "",
              color: daysLeft !== null && daysLeft <= 7 ? "from-rose-500 to-red-600" : "from-emerald-500 to-teal-600",
            },
            {
              label: "Payment Status",
              value: student.paymentStatus,
              sub: student.paymentStatus === "PAID" ? "Up to date" : "Payment due",
              color: student.paymentStatus === "PAID" ? "from-emerald-500 to-teal-600" : "from-amber-500 to-orange-600",
            },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`p-5 text-white bg-gradient-to-br ${item.color}`}>
                <p className="text-sm text-white/80 mb-1">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-white/70 mt-1">{item.sub}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pay now section */}
      <Card>
        <CardHeader>
          <CardTitle>Pay Fees Online</CardTitle>
          <CardDescription>Choose how you would like to complete your payment</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="online" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="online">Online Payment (Razorpay)</TabsTrigger>
              <TabsTrigger value="upi" disabled={!student?.library?.upiId && !student?.library?.customQrCode}>
                Direct UPI QR Payment
              </TabsTrigger>
            </TabsList>

            {/* Online payment tab */}
            <TabsContent value="online" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAYMENT_TYPES.map((type) => {
                  const amount = actualFee * type.months;
                  const isLoading = payingType === type.value;
                  return (
                    <motion.button
                      key={type.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePay(type.value, type.months)}
                      disabled={!!payingType}
                      className="flex flex-col items-center p-4 rounded-xl border-2 border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed w-full"
                    >
                      <CreditCard className="w-6 h-6 text-indigo-500 mb-2" />
                      <p className="text-sm font-semibold">{type.label}</p>
                      <p className="text-lg font-bold text-indigo-500">{formatCurrency(amount)}</p>
                      {isLoading && <p className="text-xs text-muted-foreground mt-1">Processing...</p>}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Secure payment powered by Razorpay
              </p>
            </TabsContent>

            {/* Direct UPI payment tab */}
            <TabsContent value="upi" className="mt-0">
              <div className="flex flex-col md:flex-row gap-6 items-center justify-center p-4">
                {/* UPI QR Display */}
                <div className="flex flex-col items-center space-y-4 shrink-0">
                  <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-md">
                    {generatingQr ? (
                      <div className="w-48 h-48 flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-muted-foreground animate-pulse" />
                      </div>
                    ) : upiQrUrl && student?.library?.upiId ? (
                      <div className="text-center space-y-2">
                        <img src={upiQrUrl} alt="UPI Payment QR" className="w-48 h-48 mx-auto" />
                        <p className="text-[10px] text-muted-foreground font-mono">Dynamic QR for ₹{upiAmount}</p>
                      </div>
                    ) : student?.library?.customQrCode ? (
                      <div className="text-center space-y-2">
                        <img src={student.library.customQrCode} alt="Custom Payment QR" className="w-48 h-48 object-contain mx-auto" />
                        <p className="text-[10px] text-muted-foreground">Scan to pay library</p>
                      </div>
                    ) : null}
                  </div>

                  {student?.library?.upiId && (
                    <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/50 text-xs">
                      <span className="font-mono text-muted-foreground">UPI: {student.library.upiId}</span>
                      <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => copyToClipboard(student.library!.upiId!)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Plan selector & instructions */}
                <div className="flex-1 space-y-4 max-w-sm">
                  <div className="space-y-1.5">
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

                  <div className="bg-muted/40 p-4 rounded-xl border border-border/50 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-border/50 pb-1.5 mb-1.5 font-semibold text-sm">
                      <span>Total Amount:</span>
                      <span className="text-indigo-400">{formatCurrency(upiAmount)}</span>
                    </div>
                    <p className="font-medium">Instructions:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                      <li>Scan this QR using GPay, PhonePe, Paytm, or any UPI App.</li>
                      <li>Pay the exact amount: <strong className="text-foreground">{formatCurrency(upiAmount)}</strong>.</li>
                      <li>Take a screenshot of the payment.</li>
                      <li>Inform the admin with your Transaction ID to mark it paid.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No payments yet</div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => {
                const remaining = p.status === "PARTIAL" && p.lateFee ? p.lateFee : 0;
                return (
                <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5">{statusIcon(p.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.paymentType.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.paymentId} · {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                    </p>
                    {p.status === "PARTIAL" && remaining > 0 && (
                      <div className="mt-1.5 text-[11px] bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1.5 space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">✅ Jama kiya:</span>
                          <span className="text-emerald-500 font-semibold">{formatCurrency(p.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">⏳ Baaki hai:</span>
                          <span className="text-orange-500 font-semibold">{formatCurrency(remaining)}</span>
                        </div>
                        <div className="flex justify-between border-t border-orange-500/20 pt-0.5">
                          <span className="text-muted-foreground">Monthly fee:</span>
                          <span className="font-medium">{formatCurrency((p.amount || 0) + remaining)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">{formatCurrency(p.totalAmount)}</div>
                    <span className={`text-xs font-medium ${
                      p.status === "PAID" ? "text-emerald-500" :
                      p.status === "PARTIAL" ? "text-orange-500" : "text-amber-500"
                    }`}>{p.status}</span>
                    {p.invoice && (
                      <p className="text-xs text-indigo-400">{p.invoice.invoiceNumber}</p>
                    )}
                  </div>
                  {p.invoice && (
                    <a
                      href={`/api/receipt/${p.id}`}
                      download={`receipt-${p.invoice.invoiceNumber}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" title="Download Receipt">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
