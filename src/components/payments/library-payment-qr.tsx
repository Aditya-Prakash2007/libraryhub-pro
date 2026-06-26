"use client";

import { useEffect, useState } from "react";
import { QrCode, Download, Info } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { generateQRCode } from "@/lib/qrcode";

interface LibraryPaymentQRProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: {
    id: string;
    name: string;
    razorpayKeyId?: string | null;
    primaryColor?: string;
  };
}

export function LibraryPaymentQR({ open, onOpenChange, library }: LibraryPaymentQRProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGenerating(true);

    // QR encodes the library's payment page URL
    // Students scan this → go to payment page → pay fees
    const paymentUrl = `${window.location.origin}/pay/${library.id}`;

    generateQRCode(JSON.stringify({
      type: "library_payment",
      libraryId: library.id,
      libraryName: library.name,
      url: paymentUrl,
    }))
      .then(setQrUrl)
      .catch(() => toast.error("QR generation failed"))
      .finally(() => setGenerating(false));
  }, [open, library]);

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `payment-qr-${library.name.replace(/\s+/g, "-")}.png`;
    link.click();
    toast.success("QR code downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-500" />
            Library Payment QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Card */}
          <div
            className="rounded-2xl p-6 text-white text-center space-y-4"
            style={{ background: `linear-gradient(135deg, ${library.primaryColor || "#6366f1"}, #8b5cf6)` }}
          >
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Payment QR</p>
              <h3 className="font-bold text-lg">{library.name}</h3>
            </div>

            <div className="bg-white rounded-xl p-3 mx-auto w-fit">
              {generating ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-muted-foreground animate-pulse" />
                </div>
              ) : qrUrl ? (
                <img src={qrUrl} alt="Library Payment QR" className="w-48 h-48" />
              ) : null}
            </div>

            <p className="text-white/80 text-xs">
              Students scan this QR to pay fees online
            </p>
          </div>

          {/* Info box */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-400 space-y-1">
                  <p className="font-medium">How it works:</p>
                  <p>• Print or display this QR at your library entrance</p>
                  <p>• Students scan with their phone camera</p>
                  <p>• They land on the payment page and pay fees directly</p>
                  <p>• Payment goes to <strong>your Razorpay account</strong></p>
                  {!library.razorpayKeyId && (
                    <p className="text-amber-400 font-medium mt-1">
                      ⚠️ Add your Razorpay keys in Settings → Payments for money to reach your account
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleDownload} disabled={!qrUrl}>
            <Download className="w-4 h-4" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
