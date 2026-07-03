import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-playfair",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digital Invites AI — Wedding Video Invites",
  description:
    "Create stunning animated wedding video invitations in minutes. Upload your photos, choose a style, and download a cinematic HD video invite ready for Instagram Reels and WhatsApp.",
  keywords:
    "wedding invite, video invitation, digital invite, Indian wedding, animated invite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable}`}>
      <body className="font-[var(--font-poppins)] bg-[#0A0500] text-[#F5ECD7] antialiased">
        {children}
      </body>
    </html>
  );
}
