import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "RE-F5 Dashboard",
  description: "Internal F5 BIG-IP engineer operations dashboard",
  icons: {
    icon: "/RE-logo.png",
    shortcut: "/RE-logo.png",
    apple: "/RE-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}