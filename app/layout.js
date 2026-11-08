import './globals.css';

export const metadata = {
  title: 'The Dashboard',
  description: 'A private morning view of client work, money, and the day ahead.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
