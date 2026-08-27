"use client";

/**
 * AuthGuard — wraps pages that require an authenticated user.
 *
 * Behaviour:
 *  - While the provider is hydrating (isLoading), renders nothing to avoid
 *    a flash of the protected content or a premature redirect.
 *  - Once hydration completes, if no authenticated user is present the guard
 *    redirects to `/auth/signup` using `next/navigation`'s `redirect()`.
 *  - When the user is authenticated, children are rendered normally.
 *
 * @example
 * // In a protected page's layout or the page itself:
 * export default function WalletLayout({ children }: { children: ReactNode }) {
 *   return <AuthGuard>{children}</AuthGuard>;
 * }
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

interface AuthGuardProps {
  children: ReactNode;
  /** Destination when unauthenticated. Defaults to "/auth/signup". */
  redirectTo?: string;
}

export function AuthGuard({
  children,
  redirectTo = "/auth/signup",
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, redirectTo, router]);

  // Don't render anything while hydrating or if about to redirect.
  if (isLoading || user === null) {
    return null;
  }

  return <>{children}</>;
}
