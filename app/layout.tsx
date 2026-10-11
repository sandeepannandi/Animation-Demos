import type { Metadata } from 'next'
import './globals.css'
import { GeistSans } from 'geist/font/sans'

export const metadata: Metadata = {
  title: 'Nativelet | Motion Toolkit for Next.js & React Native',
  description:
    'Copy-paste animated components built on Framer Motion and Animated. Free and open source.',
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  )
}
