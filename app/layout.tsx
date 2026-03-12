import Header from "@/components/Header"
import AppToaster from "@/components/Toaster"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import "./globals.css"

import { Outfit } from "next/font/google"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: "Premiacao Sulpet 2026",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={outfit.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Header />
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
