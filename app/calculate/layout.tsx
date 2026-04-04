import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AFT Score Calculator — Train to Pass",
  description:
    "Enter your Army Fitness Test scores and get instant pass/fail analysis with AI-generated training recommendations.",
  openGraph: {
    title: "AFT Score Calculator — Train to Pass",
    description:
      "Enter your Army Fitness Test scores and get instant pass/fail analysis with AI-generated training recommendations.",
  },
};

export default function CalculateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
