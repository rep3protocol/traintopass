import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "General Training Program — Train to Pass",
  description:
    "Build an 8-week military fitness program tailored to your goals, schedule, and equipment.",
  openGraph: {
    title: "General Training Program — Train to Pass",
    description:
      "Build an 8-week military fitness program tailored to your goals, schedule, and equipment.",
  },
};

export default function TrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
