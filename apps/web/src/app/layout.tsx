import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import EmotionRegistry from './registry'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StudiOra Notes - Smart Academic Platform',
  description: 'The ultimate academic platform combining intelligent scheduling with AI-powered note generation',
  keywords: 'study, notes, AI, scheduling, academic, university, college',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <EmotionRegistry>
          <Providers>{children}</Providers>
        </EmotionRegistry>
      </body>
    </html>
  )
}