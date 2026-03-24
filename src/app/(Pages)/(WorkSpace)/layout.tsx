import { Suspense } from "react";
import AppSidebar from "../../components/common/AppSidebar";
import { ShopifyOAuthReturnSync } from "../../components/common/ShopifyOAuthReturnSync";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Suspense fallback={null}>
        <ShopifyOAuthReturnSync />
      </Suspense>
      <AppSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
