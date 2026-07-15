"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { markAttendanceByQRStudent } from "@/actions/attendance";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Camera, AlertCircle, CheckCircle2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScannerState = "idle" | "requesting" | "scanning" | "processing" | "success" | "error" | "denied";

export function StudentSelfScanner({ libraryId }: { libraryId: string }) {
  const [state, setState] = useState<ScannerState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const divId = "qr-reader-student";

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function stopScanner() {
    if (html5QrRef.current && isScanningRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch (_) {
        // ignore
      }
      isScanningRef.current = false;
    }
  }

  async function startScanner() {
    setState("requesting");

    // Step 1: Explicitly request camera permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // Permission granted — stop the test stream right away
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setState("denied");
        return;
      } else if (err.name === "NotFoundError") {
        toast.error("No camera found on this device.");
        setState("idle");
        return;
      } else {
        toast.error("Could not access camera: " + err.message);
        setState("idle");
        return;
      }
    }

    // Step 2: Now initialize the scanner
    setState("scanning");

    try {
      const qr = new Html5Qrcode(divId);
      html5QrRef.current = qr;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        toast.error("No camera found on this device.");
        setState("idle");
        return;
      }

      // Prefer back camera
      const camera = cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[cameras.length - 1];

      await qr.start(
        camera.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {} // ignore per-frame failures
      );
      isScanningRef.current = true;
    } catch (err: any) {
      console.error("Scanner start error:", err);
      toast.error("Failed to start scanner. Please try again.");
      setState("idle");
    }
  }

  async function onScanSuccess(decodedText: string) {
    if (state === "processing") return;
    setState("processing");
    setMessage(null);

    await stopScanner();

    try {
      const res = await markAttendanceByQRStudent(libraryId);

      if ("error" in res && res.error) {
        setMessage(res.error);
        setState("error");
        toast.error(res.error);
      } else if (!res.success) {
        const errMsg = (res as { error?: string }).error ?? "Could not process attendance";
        setMessage(errMsg);
        setState("error");
        toast.error(errMsg);
      } else {
        const action = (res as any).action === "checkin" ? "Checked In" : "Checked Out";
        setMessage(`${action} Successfully!`);
        setState("success");
        toast.success(`${action} Successfully!`);
      }
    } catch (_) {
      setMessage("Failed to mark attendance. Please try again.");
      setState("error");
      toast.error("Failed to mark attendance.");
    }
  }

  function reset() {
    setMessage(null);
    setState("idle");
  }

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-6">

      {/* IDLE — show start button */}
      {state === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center w-full space-y-4 py-8"
        >
          <div className="p-5 rounded-full bg-indigo-500/10">
            <ScanLine className="h-12 w-12 text-indigo-500" />
          </div>
          <p className="text-center text-sm text-muted-foreground max-w-xs">
            Tap the button below to open your camera and scan the library's QR code to mark attendance.
          </p>
          <Button
            onClick={startScanner}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Camera className="w-4 h-4 mr-2" />
            Start Scanner
          </Button>
        </motion.div>
      )}

      {/* REQUESTING PERMISSION */}
      {state === "requesting" && (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Requesting camera permission…</p>
        </div>
      )}

      {/* SCANNING — scanner renders into this div */}
      {state === "scanning" && (
        <div className="w-full space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Point your camera at the library's QR code.
          </p>
          <div
            id={divId}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          />
          <Button variant="outline" size="sm" onClick={() => { stopScanner(); reset(); }} className="w-full">
            Cancel
          </Button>
        </div>
      )}

      {/* Keep the div in DOM while scanning so Html5Qrcode can attach to it */}
      {state !== "scanning" && (
        <div id={divId} className="hidden" />
      )}

      {/* PROCESSING */}
      {state === "processing" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-lg font-medium text-foreground">Processing Attendance…</p>
        </motion.div>
      )}

      {/* SUCCESS */}
      {state === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-8 border rounded-xl bg-emerald-500/10 border-emerald-500/20 w-full"
        >
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h2 className="text-2xl font-bold text-emerald-600 mb-2">{message}</h2>
          <p className="text-sm text-muted-foreground mb-6">Your attendance has been recorded successfully.</p>
          <Button onClick={reset} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            Scan Again
          </Button>
        </motion.div>
      )}

      {/* ERROR */}
      {state === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-8 border rounded-xl bg-rose-500/10 border-rose-500/20 w-full"
        >
          <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-rose-600 mb-2">Scan Failed</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">{message}</p>
          <Button onClick={reset} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            Try Again
          </Button>
        </motion.div>
      )}

      {/* PERMISSION DENIED */}
      {state === "denied" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-3 w-full"
        >
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <h3 className="font-semibold text-amber-500">Camera Access Blocked</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your browser blocked camera access. To fix this:
            <br />1. Click the 🔒 lock icon in your browser's address bar.
            <br />2. Find "Camera" and set it to <strong>Allow</strong>.
            <br />3. Reload the page and try again.
          </p>
          <Button variant="outline" size="sm" onClick={reset} className="w-full mt-1">
            <Camera className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </motion.div>
      )}

    </div>
  );
}
