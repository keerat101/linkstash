import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LinkStash — Your Personal Web Library',
  description: 'Save and organize your favorite links beautifully',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  )
}
