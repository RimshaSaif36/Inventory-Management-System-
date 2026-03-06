import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppWrapper from "./dashboardWrapper";
import StoreProvider from "./redux";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inventory System",
  description: "Comprehensive inventory management system for Khtab Engineering and Services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreProvider>
          <AppWrapper>{children}</AppWrapper>
        </StoreProvider>
      </body>
    </html>
  );
}
