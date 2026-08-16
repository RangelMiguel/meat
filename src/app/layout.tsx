import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'meat · calorie tracker',
  description: 'Family calorie tracker',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="grove">
      <body>{children}</body>
    </html>
  )
}
