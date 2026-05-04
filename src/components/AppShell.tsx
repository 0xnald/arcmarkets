"use client";

import { ReactNode } from "react";
import { Rail } from "./Rail";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Rail />
      <div className="ml-14 min-h-screen relative">{children}</div>
    </>
  );
}
