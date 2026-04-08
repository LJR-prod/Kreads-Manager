import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kreads Manager',
  description: 'Espace de management de l\'équipe montage Kreads',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="grain">
        {children}
      </body>
    </html>
  )
}
