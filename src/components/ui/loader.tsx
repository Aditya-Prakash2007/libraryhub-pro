"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background/80 backdrop-blur-sm text-foreground select-none relative w-full h-full">
      {/* Ambient premium background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-4 z-10">
        <div className="relative flex items-center justify-center">
          {/* Glow circle behind spinner */}
          <div className="absolute w-12 h-12 rounded-full border border-primary/20 animate-ping" />
          <Loader2 className="w-10 h-10 text-primary animate-spin relative" />
        </div>
        
        <div className="flex flex-col items-center gap-1.5 text-center mt-2">
          <h2 className="text-xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-primary animate-pulse">
            LibraryHub Pro
          </h2>
          <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
            Loading, please wait...
          </p>
        </div>
      </div>
    </div>
  );
}
