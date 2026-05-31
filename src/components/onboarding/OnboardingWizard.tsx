"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SpotlightCard,
  SpotlightCardHeader,
  SpotlightCardTitle,
} from "@/components/ui/spotlight-card";
import { StepIndicator } from "./StepIndicator";
import {
  ArrowLeftMark,
  BranchMark,
  BuildingMark,
  ChevronRightMark,
  CloseMark,
  DollarMark,
  MailMark,
  PlusMark,
  SourcesMark,
  SuccessMark,
  UsersMark,
} from "@/components/ui/marks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessInfo {
  companyName: string;
  industry: string;
  teamSize: string;
}

interface Integrations {
  supabase: boolean;
  stripe: boolean;
}

interface TeamInvite {
  emails: string[];
}

interface OnboardingData {
  businessInfo: BusinessInfo;
  integrations: Integrations;
  teamInvites: TeamInvite;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const businessInfoSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(100),
  industry: z.string().trim().min(1, "Please select an industry"),
  teamSize: z.string().trim().min(1, "Please select a team size"),
});

const emailSchema = z.string().email("Invalid email address");

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { label: "Business", description: "Company details" },
  { label: "Integrations", description: "Connect tools" },
  { label: "Team", description: "Invite people" },
];

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Real Estate",
  "Consulting",
  "Manufacturing",
  "Education",
  "Other",
];

const TEAM_SIZES = [
  "Just me",
  "2-5",
  "6-10",
  "11-25",
  "26-50",
  "51-200",
  "200+",
];

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  color: "var(--ink-primary)",
  background: "var(--surface-1)",
  border: "1px solid #27272a",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.12s ease",
  appearance: "none" as const,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === "string" ? params.locale : "en";

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Form data
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    companyName: "",
    industry: "",
    teamSize: "",
  });

  const [integrations, setIntegrations] = useState<Integrations>({
    supabase: false,
    stripe: false,
  });

  const [teamEmails, setTeamEmails] = useState<string[]>([""]);
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});

  // ─── Step navigation ──────────────────────────────────────────────────────

  const validateCurrentStep = useCallback((): boolean => {
    if (currentStep === 0) {
      const result = businessInfoSchema.safeParse(businessInfo);
      if (!result.success) {
        toast.error(result.error.errors[0]?.message ?? "Please fill in all fields.");
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      // Validate emails (skip empty ones)
      const errors: Record<number, string> = {};
      teamEmails.forEach((email, index) => {
        if (email.trim()) {
          const result = emailSchema.safeParse(email.trim());
          if (!result.success) {
            errors[index] = "Invalid email";
          }
        }
      });
      setEmailErrors(errors);
      if (Object.keys(errors).length > 0) {
        toast.error("Please fix the email errors.");
        return false;
      }
      return true;
    }
    return true;
  }, [currentStep, businessInfo, teamEmails]);

  const goNext = useCallback(() => {
    if (!validateCurrentStep()) return;

    const newCompleted = [...new Set([...completedSteps, currentStep])];
    setCompletedSteps(newCompleted);

    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step completed
      setIsComplete(true);
    }
  }, [currentStep, completedSteps, validateCurrentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipStep = useCallback(() => {
    const newCompleted = [...new Set([...completedSteps, currentStep])];
    setCompletedSteps(newCompleted);

    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  }, [currentStep, completedSteps]);

  const goSkip = useCallback(() => {
    if (currentStep === 0) {
      // Business info is required, so no skip on step 1
      toast.error("Please enter your business info to continue.");
      return;
    }
    skipStep();
  }, [currentStep, skipStep]);

  // ─── Email management ──────────────────────────────────────────────────────

  const addEmailField = useCallback(() => {
    setTeamEmails((prev) => [...prev, ""]);
  }, []);

  const removeEmailField = useCallback((index: number) => {
    setTeamEmails((prev) => prev.filter((_, i) => i !== index));
    setEmailErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const updateEmail = useCallback((index: number, value: string) => {
    setTeamEmails((prev) => prev.map((email, i) => (i === index ? value : email)));
    setEmailErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  // ─── Render steps ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Company name
              </label>
              <Input
                value={businessInfo.companyName}
                onChange={(e) =>
                  setBusinessInfo((prev) => ({ ...prev, companyName: e.target.value }))
                }
                placeholder="Acme Corp"
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-11 rounded-lg focus-visible:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Industry
              </label>
              <select
                value={businessInfo.industry}
                onChange={(e) =>
                  setBusinessInfo((prev) => ({ ...prev, industry: e.target.value }))
                }
                style={selectStyle}
                className="bg-zinc-900 border-zinc-700 text-white rounded-lg"
              >
                <option value="">Select your industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Team size
              </label>
              <div className="flex flex-wrap gap-2">
                {TEAM_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setBusinessInfo((prev) => ({ ...prev, teamSize: size }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      businessInfo.teamSize === size
                        ? "border-red-500 bg-red-500/10 text-red-400"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-500 mb-2">
              Connect your tools to get the most out of the platform. You can always
              do this later in settings.
            </p>

            {/* Supabase integration */}
            <div
              onClick={() =>
                setIntegrations((prev) => ({ ...prev, supabase: !prev.supabase }))
              }
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                integrations.supabase
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  integrations.supabase ? "bg-emerald-500/20" : "bg-zinc-800"
                }`}
              >
                <SourcesMark className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Supabase</p>
                <p className="text-xs text-zinc-500">
                  Database, auth, and real-time subscriptions
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  integrations.supabase
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-zinc-600"
                }`}
              >
                {integrations.supabase && <SuccessMark className="w-3 h-3 text-white" />}
              </div>
            </div>

            {/* Stripe integration */}
            <div
              onClick={() =>
                setIntegrations((prev) => ({ ...prev, stripe: !prev.stripe }))
              }
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                integrations.stripe
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  integrations.stripe ? "bg-emerald-500/20" : "bg-zinc-800"
                }`}
              >
                <DollarMark className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Stripe</p>
                <p className="text-xs text-zinc-500">
                  Payments, billing, and subscriptions
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  integrations.stripe
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-zinc-600"
                }`}
              >
                {integrations.stripe && <SuccessMark className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-500 mb-2">
              Invite your team members to collaborate. You can always invite people
              later.
            </p>

            {teamEmails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <MailMark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    placeholder="colleague@company.com"
                    className={`pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-11 rounded-lg ${
                      emailErrors[index] ? "border-red-500" : ""
                    }`}
                  />
                </div>
                {teamEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmailField(index)}
                    className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/50 transition-colors"
                  >
                    <CloseMark className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addEmailField}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
            >
              <PlusMark className="w-4 h-4" />
              Add another team member
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Completion screen ─────────────────────────────────────────────────────

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.2)"
            borderRadius={16}
            className="w-full max-w-md"
          >
            <div className="flex flex-col items-center text-center py-8 px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
              >
                <BranchMark className="w-8 h-8 text-emerald-400" />
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-2">
                You&apos;re all set!
              </h1>
              <p className="text-sm text-zinc-400 mb-8 max-w-xs">
                Your workspace is ready. Jump into your dashboard and start building.
              </p>

              <Button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm"
              >
                Go to Dashboard
                <ChevronRightMark className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </SpotlightCard>
        </motion.div>
      </div>
    );
  }

  // ─── Wizard UI ─────────────────────────────────────────────────────────────

  const stepIcons = [BusinessInfoStepIcon, IntegrationsStepIcon, TeamStepIcon];
  const StepIcon = stepIcons[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Set up your workspace</h1>
          <p className="text-sm text-zinc-500">
            Takes about 2 minutes. You can skip non-essential steps.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Wizard card */}
        <SpotlightCard
          spotlightColor="rgba(179, 0, 0, 0.2)"
          borderRadius={16}
        >
          <SpotlightCardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <StepIcon />
              </div>
              <div>
                <SpotlightCardTitle className="text-lg text-white">
                  {STEPS[currentStep].label}
                </SpotlightCardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Step {currentStep + 1} of {STEPS.length}
                </p>
              </div>
            </div>
          </SpotlightCardHeader>

          <div className="px-6 pb-6">
            {/* Animated step content */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-zinc-800">
              <div>
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                  >
                    <ArrowLeftMark className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={goSkip}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <BranchMark className="w-3.5 h-3.5" />
                    Skip
                  </button>
                )}

                <Button
                  onClick={goNext}
                  className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-6"
                >
                  {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
                  <ChevronRightMark className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}

// ─── Step icons ───────────────────────────────────────────────────────────────

function BusinessInfoStepIcon() {
  return <BuildingMark className="w-5 h-5 text-red-400" />;
}

function IntegrationsStepIcon() {
  return <SourcesMark className="w-5 h-5 text-red-400" />;
}

function TeamStepIcon() {
  return <UsersMark className="w-5 h-5 text-red-400" />;
}
