import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pre-Enlistment Prep — Train to Pass",
  description:
    "12-week AI prep plan to get ready for the Army fitness test before basic training.",
  openGraph: {
    title: "Pre-Enlistment Prep — Train to Pass",
    description:
      "12-week AI prep plan to get ready for the Army fitness test before basic training.",
  },
};

export default function EnlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
