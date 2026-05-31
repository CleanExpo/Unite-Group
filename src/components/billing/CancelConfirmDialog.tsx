"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CancelConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanName: string;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CancelConfirmDialog({
  open,
  onOpenChange,
  currentPlanName,
  onSuccess,
}: CancelConfirmDialogProps) {
  const [reason, setReason] = useState<string>("other");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCancel() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to cancel subscription");
      }

      toast.success("Subscription cancelled", {
        description:
          data.message ??
          "Your subscription will end at the close of your current billing period.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to cancel", {
        description: err.message ?? "Please try again or contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg text-slate-100">
                Cancel Subscription
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to cancel your {currentPlanName} plan?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-300/90 leading-relaxed">
              You will retain access to all {currentPlanName} features until the
              end of your current billing period. After that, your account will
              be downgraded to the free tier.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Help us improve — why are you cancelling?
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="border-slate-600 bg-slate-800 text-slate-200">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="too_expensive">
                  Too expensive
                </SelectItem>
                <SelectItem value="missing_features">
                  Missing features I need
                </SelectItem>
                <SelectItem value="switching_service">
                  Switching to another service
                </SelectItem>
                <SelectItem value="not_using_enough">
                  Not using it enough
                </SelectItem>
                <SelectItem value="technical_issues">
                  Technical issues
                </SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            Keep my plan
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel anyway"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
