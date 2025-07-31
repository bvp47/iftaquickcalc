import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IFTA QuickCalc - Professional IFTA Tax Calculation',
  description: 'Skip the hours of manual calculations. Get audit-ready IFTA numbers in minutes for truck drivers and fleet operators.',
  keywords: 'IFTA, fuel tax, truck drivers, tax calculation, interstate fuel tax',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
