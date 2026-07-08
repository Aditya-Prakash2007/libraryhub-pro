"use client";

import React, { createContext, useContext } from "react";

const LoadingContext = createContext<{
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}>({
  isLoading: false,
  setIsLoading: () => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  return (
    <LoadingContext.Provider value={{ isLoading: false, setIsLoading: () => {} }}>
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);

