"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CreditCard, Download, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency, formatDate, daysUntilExpiry } from "@/lib/utils";
import { createRazorpayOrder, verifyPayment } from "@/actions/payments";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { PAYMENT_TYPES } from "@/constants";

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  totalAmount: number;
  paymentType: string;
  paymentMode: string;
  status: string;
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
    paymentStatus: string;
    expiryDate?: Date | null;
    libraryId: string;
    library?: { name: string } | null;
  } | null;
}

export function StudentPaymentsPage({ payments, student }: StudentPaymentsPageProps) {
  const [payingType, setPayingType] = useState<string | null>(null);

  const daysLeft = student?.expiryDate ? daysUntilExpiry(student.expiryDate) : null;

  const handlePay = async (paymentType: string, months: number) => {
    if (!student) return;
    const amount = student.monthlyFee * months;
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
        theme: { color: "#6366f1" },
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

  const statusIcon = (status: string) => {
    if (status === "PAID") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "PENDING") return <Clock className="w-4 h-4 text-amber-500" />;
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
              value: formatCurrency(student.monthlyFee),
              sub: "Per month",
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PAYMENT_TYPES.map((type) => {
              const amount = (student?.monthlyFee || 0) * type.months;
              const isLoading = payingType === type.value;
              return (
                <motion.button
                  key={type.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePay(type.value, type.months)}
                  disabled={!!payingType}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-6 h-6 text-indigo-500 mb-2" />
                  <p className="text-sm font-semibold">{type.label}</p>
                  <p className="text-lg font-bold text-indigo-500">{formatCurrency(amount)}</p>
                  {isLoading && <p className="text-xs text-muted-foreground mt-1">Processing...</p>}
                </motion.button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Secure payment powered by Razorpay
          </p>
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
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  {statusIcon(p.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.paymentType.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.paymentId} · {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatCurrency(p.totalAmount)}</p>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
