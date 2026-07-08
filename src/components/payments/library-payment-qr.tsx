"use client";

import { useEffect, useState, useRef } from "react";
import { QrCode, Download, Info, Upload, Trash2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateQRCode } from "@/lib/qrcode";
import { getLibraryQrCode, updateLibraryQrCode } from "@/actions/library";

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
  const [customQrUrl, setCustomQrUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load generated QR and custom QR
  useEffect(() => {
    if (!open) return;
    setGenerating(true);

    // QR encodes the library's payment page URL
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

    // Fetch custom QR code
    getLibraryQrCode().then((res) => {
      if (res && "customQrCode" in res) {
        setCustomQrUrl(res.customQrCode || null);
      }
    });
  }, [open, library]);

  const handleDownloadGenerated = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `payment-link-qr-${library.name.replace(/\s+/g, "-")}.png`;
    link.click();
    toast.success("QR code downloaded!");
  };

  const handleDownloadCustom = () => {
    if (!customQrUrl) return;
    const link = document.createElement("a");
    link.href = customQrUrl;
    link.download = `direct-payment-qr-${library.name.replace(/\s+/g, "-")}.png`;
    link.click();
    toast.success("Custom QR code downloaded!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await updateLibraryQrCode(base64);
      if (res && "success" in res) {
        setCustomQrUrl(base64);
        toast.success("Custom payment QR code uploaded!");
      } else {
        toast.error("Failed to upload custom QR code");
      }
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Error reading file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustom = async () => {
    if (!confirm("Are you sure you want to remove your custom payment QR?")) return;
    setUploading(true);
    const res = await updateLibraryQrCode(null);
    if (res && "success" in res) {
      setCustomQrUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Custom payment QR code removed");
    } else {
      toast.error("Failed to remove custom QR code");
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-500" />
            Library Payment QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {customQrUrl ? (
            <div
              className="rounded-2xl p-6 text-white text-center space-y-4"
              style={{ background: `linear-gradient(135deg, ${library.primaryColor || "#6366f1"}, #8b5cf6)` }}
            >
              <div>
                <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Your Direct Payment QR</p>
                <h3 className="font-bold text-lg">{library.name}</h3>
              </div>

              <div className="bg-white rounded-xl p-3 mx-auto w-fit">
                <img src={customQrUrl} alt="Custom Direct QR" className="w-48 h-48 object-contain" />
              </div>

              <p className="text-white/80 text-xs">
                This custom QR code is shown to students on their payments page for direct UPI deposits
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-muted/10 hover:bg-muted/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">Upload your Payment QR Code</p>
                <p className="text-xs text-muted-foreground mt-1">Paytm, PhonePe, GPay, or any bank UPI QR image (Max 2MB)</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose QR Image
              </Button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <Card className="border-indigo-500/20 bg-indigo-500/5">
            <CardContent className="p-3">
              <div className="flex gap-2">
                <Info className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-300 space-y-1">
                  <p className="font-medium">Direct UPI QR Payments:</p>
                  <p>• Students scan this QR code directly to pay your merchant/UPI account</p>
                  <p>• Students upload receipts or notify you to mark it paid manually</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {customQrUrl && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-semibold" onClick={handleDownloadCustom}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
              <Button variant="outline" className="flex-1 font-semibold border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="w-4 h-4 mr-2" /> Change QR
              </Button>
              <Button variant="destructive" size="icon" onClick={handleRemoveCustom} disabled={uploading}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

