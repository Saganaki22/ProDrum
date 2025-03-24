import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AudioContextProvider } from "@/hooks/use-audio-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Pro Drum Machine",
  description: "Professional Beat Creator",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AudioContextProvider>{children}</AudioContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'