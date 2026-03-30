import type { Metadata } from "next";
import ImmortelLanding from "@/app/components/landing";

export const metadata: Metadata = {
  title: "Immortell — The Future of Commerce is Being Written",
  description:
    "From citation to checkout — inside the AI answer. Immortell turns AI recommendations into instant transactions for your brand.",
};

export default function LandingPage() {
  return <ImmortelLanding />;
}
