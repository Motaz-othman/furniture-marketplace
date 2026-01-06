import './globals.css'
import { Jost, Playfair_Display } from 'next/font/google'

const jost = Jost({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata = {
  title: 'Lulu & Georgia Concept',
  description: 'Organic Modern Decor',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${jost.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  )
}