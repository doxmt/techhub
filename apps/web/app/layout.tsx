import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TechHub",
    template: "%s | TechHub"
  },
  description: "개발 아티클과 유튜브를 큐레이션하는 공개 피드",
  openGraph: {
    title: "TechHub",
    description: "개발 아티클과 유튜브를 큐레이션하는 공개 피드",
    siteName: "TechHub",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
