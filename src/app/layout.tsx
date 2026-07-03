import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAYROLLIN - Smart HR Platform",
  description:
    "Absensi, reimbursement, dan manajemen izin karyawan dalam satu platform enterprise.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
