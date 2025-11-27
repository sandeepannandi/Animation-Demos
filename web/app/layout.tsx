import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Web Animations',
  description: 'Contains web animated components',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
