"use client";

/**
 * useAuth — convenience hook for consuming AuthContext.
 *
 * Throws a descriptive error when called outside <AuthProvider> so that
 * missing-provider bugs are caught immediately during development.
 *
 * @example
 * const { user, login, logout, isLoading } = useAuth();
 */

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (ctx === null) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>. " +
        "Make sure <AuthProvider> wraps your component tree (e.g. in the root layout).",
    );
  }

  return ctx;
}
