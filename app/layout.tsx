import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gifs.gmis.me"),
  title: "GIF Emotion Atlas | GMIS",
  description: "An interactive research dashboard mapping 3,647 StockTwits GIFs across emotion, agreement, and CLIP embedding space.",
  openGraph: {
    title: "GIF Emotion Atlas",
    description: "3,647 GIFs. Two vision models. Seven visual clusters.",
    type: "website",
    url: "https://gifs.gmis.me",
    images: [{ url: "/og.png", width: 1732, height: 900, alt: "GIF Emotion Atlas — 3,647 GIFs, two vision models, seven clusters" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GIF Emotion Atlas",
    description: "3,647 GIFs. Two vision models. Seven visual clusters.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
