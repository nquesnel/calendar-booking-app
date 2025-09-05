import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CalendarSync - Effortless Meeting Scheduling",
  description: "End the back-and-forth of scheduling. Connect calendars instantly and find the perfect meeting time in seconds.",
  keywords: "calendar scheduling, meeting scheduler, calendar sync, appointment booking",
  openGraph: {
    title: "CalendarSync - Effortless Meeting Scheduling",
    description: "End the back-and-forth of scheduling. Connect calendars instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}