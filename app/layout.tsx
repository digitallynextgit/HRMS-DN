import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers/providers"

export const metadata: Metadata = {
  title: {
    template: "%s | HRMS",
    default: "HRMS — Human Resource Management System",
  },
  description: "Modern HRMS for managing your workforce",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
