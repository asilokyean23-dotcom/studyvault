import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyVault — Your school files, anywhere",
  description: "A private, responsive space for your school files.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
