import { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding - Unite Group",
  description: "Set up your workspace and get started with Unite Group.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
