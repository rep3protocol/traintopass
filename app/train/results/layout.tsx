import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Training Program — Train to Pass",
  description: "Your personalized 8-week military fitness program.",
  openGraph: {
    title: "Your Training Program — Train to Pass",
    description: "Your personalized 8-week military fitness program.",
  },
};

export default function TrainResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
