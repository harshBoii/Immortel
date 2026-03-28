import type { Metadata } from "next";
import { Space_Grotesk, Outfit, Fira_Code, Playfair_Display, DM_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { FloatingLiveWebinarButton } from "./components/webinar/FloatingLiveWebinarButton";
import { ThemeProvider } from "./components/common/ThemeProvider";

const themeScript = `
(function() {
  var t = localStorage.getItem('theme');
  var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
`;

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Immortel",
  description: "Next.js app with Prisma and API routes",
  icons: {
    icon: "/Immortel_Logo_Dark.png",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceGrotesk.variable} ${firaCode.variable} ${playfairDisplay.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-body antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          {children}
          <FloatingLiveWebinarButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
