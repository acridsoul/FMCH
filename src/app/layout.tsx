import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Film Production Command Hub - Streamline Your Production from Script to Screen",
  description: "The all-in-one command hub that eliminates scheduling conflicts, budget overruns, and miscommunication. Manage your entire film production in one place with real-time collaboration, smart scheduling, and budget tracking.",
  keywords: [
    "film production",
    "production management",
    "film scheduling",
    "budget tracking",
    "crew management",
    "film project management",
    "production coordination",
    "film industry software"
  ],
  authors: [{ name: "Mount Kenya University" }],
  creator: "Mount Kenya University - School of Computing and Informatics",
  openGraph: {
    title: "Film Production Command Hub",
    description: "Streamline your film production from script to screen with our all-in-one management platform.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Film Production Command Hub",
    description: "The all-in-one command hub for film production management.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
