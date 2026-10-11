import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nativelet - An interface playground, with native in mind",
  description:
    "Explore Nativelet: an open-source interface playground with a live web Preview Rail. React Native components and blocks are planned, not released yet.",
  openGraph: {
    title: "Nativelet",
    description:
      "Small interactions. A little more feeling. Explore the web playground and the React Native direction.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Nativelet",
    description: "An open-source interface playground, with native in mind.",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
