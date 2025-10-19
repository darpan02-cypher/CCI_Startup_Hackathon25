import './globals.css'

export const metadata = {
  title: 'Work-a-Holy Analytics',
  description: 'AI-Powered Workforce Wellbeing Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}