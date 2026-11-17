import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegistrar } from "@/components/PwaRegistrar";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Mailico";

export const metadata: Metadata = {
  title: appName,
  description: `Set up and manage your organization's company mail with ${appName}`,
  applicationName: appName,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#286653" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const token = await getToken();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegistrar />
        <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
