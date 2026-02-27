import type { Metadata } from "next";
import "./globals.css";
import { FloatingLiveWebinarButton } from "./components/webinar/FloatingLiveWebinarButton";

export const metadata: Metadata = {
  title: "Immortel",
  description: "Next.js app with Prisma and API routes",
  icons: {
    icon: "/Immortel_Logo.png",   // or "/Immortel_Logo.ico" / ".svg"
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground font-body antialiased">
        {children}
        <FloatingLiveWebinarButton />
      </body>
    </html>
  );
}
