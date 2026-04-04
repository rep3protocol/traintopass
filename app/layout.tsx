import type { Metadata } from "next";
import { Barlow, Bebas_Neue } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://traintopass.com"),
  title:
    "Train to Pass — Army Fitness Test Score Calculator & Training Plans",
  description:
    "Calculate your AFT scores instantly and get a personalized 4-week training plan built around your weakest events.",
  openGraph: {
    siteName: "Train to Pass",
    type: "website",
    title:
      "Train to Pass — Army Fitness Test Score Calculator & Training Plans",
    description:
      "Calculate your AFT scores instantly and get a personalized 4-week training plan built around your weakest events.",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bebas.variable} ${barlow.variable} min-h-screen bg-forge-bg font-body antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
