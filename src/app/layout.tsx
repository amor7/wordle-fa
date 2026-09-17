import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "وردل فارسی",
  description: "بازی حدس کلمه فارسی، مثل وردل",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "وردل فارسی",
  },
};

export const viewport: Viewport = {
  themeColor: "#538d4e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
