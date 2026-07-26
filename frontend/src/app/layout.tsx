import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Breadcrumbs, Container, Footer, Header, ToastViewport } from "@/components";
import { Providers } from "@/lib/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Buriti Shopping",
  description: "Ecommerce com checkout integrado e autenticacao JWT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <Container className="flex-1 py-4">
            <Breadcrumbs className="mb-4" />
            {children}
          </Container>
          <Footer />
          <ToastViewport />
        </Providers>
      </body>
    </html>
  );
}
