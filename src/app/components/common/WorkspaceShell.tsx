"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/app/components/common/AppSidebar";
import HqAppSidebar from "@/app/components/common/HqAppSidebar";
import { ShopifyOAuthReturnSync } from "@/app/components/common/ShopifyOAuthReturnSync";
import { Suspense } from "react";

export default function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHq = pathname === "/hq" || pathname?.startsWith("/hq/");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Suspense fallback={null}>
        <ShopifyOAuthReturnSync />
      </Suspense>
      {isHq ? <HqAppSidebar /> : <AppSidebar />}
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
