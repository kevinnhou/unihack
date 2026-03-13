import "@unihack/ui/globals.css";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { getToken } from "@/lib/convex";
import { generateMetadata, generateStructuredData } from "@/lib/metadata";
import Providers from "~/providers";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const NotoSansMono = Noto_Sans_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono",
});

const alliance = localFont({
  src: [
    {
      path: "./AllianceNo2-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = generateMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const convexToken = await getToken();

  return (
    <html
      className={`${alliance.className} ${NotoSansMono.variable} antialiased`}
      dir="ltr"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <Script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: PASS
          dangerouslySetInnerHTML={generateStructuredData()}
          type="application/ld+json"
        />
      </head>
      <body className="select-none overflow-hidden">
        <Providers convexToken={convexToken}>{children}</Providers>
      </body>
    </html>
  );
}
