"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { markAttendanceByQRStudent } from "@/actions/attendance";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Camera, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentSelfScanner({ libraryId }: { libraryId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivId = "qr-reader-student";

  useEffect(() => {
    // Initialize Scanner
    const scanner = new Html5QrcodeScanner(
      scannerDivId,
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true
      },
      false
    );
    scannerRef.current = scanner;

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPermissionDenied(false);
    
    if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
    }

    try {
      const res = await markAttendanceByQRStudent(libraryId);
      
      if ("error" in res && res.error) {
        setError(res.error);
        toast.error(res.error);
      } else if (!res.success) {
        setError((res as { error?: string }).error ?? "Could not process attendance");
        toast.error((res as { error?: string }).error ?? "Could not process attendance");
      } else {
        const action = (res as any).action === "checkin" ? "Checked In" : "Checked Out";
        setSuccess(`${action} Successfully!`);
        toast.success(`${action} Successfully!`);
      }
    } catch (e) {
      setError("Failed to mark attendance. Please try again.");
      toast.error("Failed to mark attendance.");
    } finally {
      setLoading(false);
    }
  }

  function onScanFailure(error: any) {
    // If the error string contains permission denied, we flag it.
    if (typeof error === 'string' && (error.includes("NotAllowedError") || error.includes("Permission denied"))) {
      setPermissionDenied(true);
    }
  }

  const requestPermissionManually = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      window.location.reload(); // Reload to re-initialize scanner once permission is granted
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Camera access is still blocked by your browser.");
      } else if (err.name === 'NotFoundError') {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not access camera: " + err.message);
      }
    }
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-6">
      {!success && !loading && !error && (
        <div className="w-full">
            <p className="text-center text-sm text-muted-foreground mb-4">Point your camera at the library's QR code to mark your attendance (In/Out).</p>
            
            {permissionDenied && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col items-center text-center space-y-3"
              >
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <h3 className="font-semibold text-amber-500">Camera Access Blocked</h3>
                <p className="text-xs text-muted-foreground">
                  Your browser is blocking camera access. To fix this:
                  <br/>1. Click the 🔒 lock icon in your browser's address bar.
                  <br/>2. Find "Camera" and change it to "Allow".
                  <br/>3. Reload this page.
                </p>
                <Button variant="outline" size="sm" onClick={requestPermissionManually} className="w-full mt-2">
                  <Camera className="w-4 h-4 mr-2" /> Try Again
                </Button>
              </motion.div>
            )}

            <div id={scannerDivId} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" />
        </div>
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-lg font-medium text-foreground">Processing Attendance...</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-8 border rounded-xl bg-emerald-500/10 border-emerald-500/20 w-full"
        >
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h2 className="text-2xl font-bold text-emerald-600 mb-2">{success}</h2>
          <p className="text-sm text-muted-foreground mb-6">Your attendance has been recorded successfully.</p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Scan Again
          </Button>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-8 border rounded-xl bg-rose-500/10 border-rose-500/20 w-full"
        >
          <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-rose-600 mb-2">Scan Failed</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </Button>
        </motion.div>
      )}
    </div>
  );
}

