import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dbot",
  description: "Extract DESIGN.md intelligence from public websites."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
