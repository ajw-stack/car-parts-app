"use client";

import type { ReactNode } from "react";
import { useIsAdmin } from "../lib/auth/useIsAdmin";

/** Renders its children only for signed-in admins. */
export default function AdminOnly({ children }: { children: ReactNode }) {
  return useIsAdmin() ? <>{children}</> : null;
}
