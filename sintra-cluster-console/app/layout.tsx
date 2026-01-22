import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SintraPrime Cluster Console",
  description: "Command center UI for the SintraPrime router",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
