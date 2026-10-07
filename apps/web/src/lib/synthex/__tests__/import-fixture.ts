export function acceptedBundle() {
  return {
    version: 1,
    packetId: `op_${"a".repeat(64)}`,
    revision: 2,
    executionBlocked: true,
    review: { state: "accepted" },
    proposal: {
      title: "Operator captured proposal",
      targetProject: { name: "Synthex", repository: "CleanExpo/Synthex" },
      targetBusiness: "Unite-Group",
      customerProblemHypothesis: "Operators need a clearer handoff.",
      sources: [
        {
          url: "https://example.org/article",
          capturedAt: "2026-10-06T01:00:00.000Z",
          publishedAt: "2026-10-05T01:00:00.000Z",
          claims: ["A creator reports a problem."],
        },
      ],
      uniteEvidence: [
        {
          reference: "operator/observation",
          observation: "An operator observed a manual handoff.",
          capturedAt: "2026-10-06T02:00:00.000Z",
        },
      ],
      confidence: 0.6,
      assumptions: ["The observation may recur."],
      uncertainties: ["Demand has not been tested."],
      suggestedOwner: "Phill",
      kpi: {
        name: "Handoff time",
        unit: "minutes",
        baselineRequirement: "Measure existing handoffs first.",
      },
      successCriteria: "Operators confirm the problem.",
      stopCriteria: "No recurring problem is found.",
      nextValidationStep: "Interview two operators.",
      spendBoundary: { currency: "AUD", maxSpend: 0 },
      demandValidated: false,
      revenueValidated: false,
    },
    opportunity: {
      name: "Operator captured proposal",
      stage: "blocked_review",
      status: "blocked_review",
      source: "synthex",
      source_detail: "Synthex review reference",
      next_action: "Interview two operators.",
    },
  };
}
