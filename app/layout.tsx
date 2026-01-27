import "./globals.css"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import Header from "@/components/Header"
import AppToaster from "@/components/Toaster"

export const metadata: Metadata = {
  title: "Premiação Sulpet 2026",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
