import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SWAKELOLASDA | Dinas PU Bojonegoro',
  description: 'Sistem Swakelola Pengelolaan Sumber Daya Air - Dinas PU Kabupaten Bojonegoro',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
