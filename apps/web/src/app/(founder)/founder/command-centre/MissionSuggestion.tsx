"use client";

import { createContext, useContext, useId, useRef, useState } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { IdeaLifecycle } from "@/lib/command-centre/idea-lifecycle";
import styles from "./mission-lifecycle.module.css";
import desk from "./founder-desk.module.css";

export const MissionSuggestionContext = createContext<IdeaLifecycle | null>(
  null,
);

/** Draft wording only: never supplies evidence, identifiers, or new authority. */
export function missionSuggestion(
  state: IdeaLifecycle,
  name: string,
  label: string,
): string | undefined {
  const brief = state.brief?.snapshot.brief;
  const title = state.title.slice(0, 300);
  const scope = state.rawIdea.slice(0, 1500);
  switch (name) {
    case "objective":
      return (
        state.mandate?.objective ||
        `Research ${title}: identify existing capabilities to reuse, compare practical options, record evidence and uncertainty, and propose the smallest useful next step. Preserve the scope in the original idea:\n${scope}`
      );
    case "allowedSources":
      return "The original idea and notes already attached to this mission\nSources already recorded in this mission; request a decision before accessing any additional source or account";
    case "summary":
      return `Mission recorded: ${title}. The ledger currently contains ${state.sources.length} source records and ${state.claims.length} statements. These counts do not establish research completion or verify the statements. Review the records and add actual findings before marking research complete.`;
    case "nextStep":
      return state.openDecisions.length
        ? `Resolve the next recorded decision: ${state.openDecisions[0]}. Then continue within the saved research boundaries.`
        : !state.mandate
          ? "Agree and save the research objective and permitted sources, then review a bounded research request."
          : !state.checkpoint || state.checkpoint.status !== "complete"
            ? "Review the permitted sources, record supporting and conflicting evidence, and save the remaining uncertainty in a checkpoint."
            : "Draft the brief from the saved findings, compare options and acceptance criteria, and submit it for review.";
    case "blockers":
      return state.checkpoint?.blockers.join("\n") || undefined;
    case "openDecisions":
      return (
        state.openDecisions.join("\n") ||
        `Which user outcome should ${title} validate first?\nWhat evidence would justify proceeding, revising or stopping?`
      );
    case "user":
      return (
        brief?.user ||
        "To confirm: the person carrying out the main journey described in the original idea."
      );
    case "payer":
      return (
        brief?.payer ||
        "Not decided — confirm whether this is internal value or a customer-funded product before setting a commercial target."
      );
    case "nonGoals":
      return "Unrequested features outside the original idea\nBuild dispatch, merge, publication or spending without their separate required authority";
    case "criterion":
      return `The intended user can review a clear proposal for ${title}.\nThe proposal separates recorded evidence, assumptions and unresolved decisions.\nThe next useful action and its required authority are visible.`;
    case "validation":
      return "Walk through the proposed journey with the intended user and record their feedback.\nTrace each consequential statement to its saved source or mark it as unverified.\nCheck that the next action respects the saved scope and stops at the required approval.";
    case "design":
      return `Proposed journey for ${title}: show the user's goal, offer a suggested next step with accept/edit/custom choices, preserve their notes, and present a reviewable result with evidence and remaining decisions. Confirm visual references before implementation.`;
    case "risks":
      return "Assumptions may be mistaken for verified findings.\nThe proposed journey may not solve the intended user's first problem.\nContinuation must respect the mission's scope, account allowances and approval boundaries.";
    case "repository":
      return brief?.target.repository || state.outcome?.repository || undefined;
    default:
      if (name.startsWith("outputContent")) {
        const index = Number(name.replace("outputContent", ""));
        const saved = brief?.outputs.find(
          (item) => item.id === index + 1,
        )?.content;
        return (
          saved ||
          `Research still needed for ${label.replace(": finding or reason", "")}. Record the relevant sources, what they establish, remaining uncertainty and the next validation step before treating this output as included.`
        );
      }
      return undefined;
  }
}

type Props = {
  label: string;
  name: string;
  suggestion?: string;
  multiline?: boolean;
  onDraftChange?: () => void;
  onValueChange?: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "defaultValue"> & {
    defaultValue?: string | number | readonly string[];
    rows?: number;
  };

/** Accepting changes local form text only; submitting remains a separate action. */
export function MissionSuggestion({
  label,
  name,
  suggestion: supplied,
  multiline = false,
  defaultValue,
  value: controlledValue,
  onDraftChange,
  onValueChange,
  ...props
}: Props) {
  const state = useContext(MissionSuggestionContext);
  const id = useId();
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [localText, setLocalText] = useState(String(defaultValue ?? ""));
  const text =
    controlledValue === undefined ? localText : String(controlledValue);
  function setText(next: string) {
    setLocalText(next);
    onValueChange?.(next);
  }
  const [dismissed, setDismissed] = useState(false);
  const suggestion =
    supplied ?? (state ? missionSuggestion(state, name, label) : undefined);
  const available =
    !!suggestion &&
    (!props.maxLength || suggestion.length <= props.maxLength) &&
    !dismissed &&
    text.length === 0 &&
    !props.readOnly;
  function accept(edit: boolean) {
    if (!available || input.current?.matches(":disabled")) return;
    setText(suggestion!);
    onDraftChange?.();
    input.current?.focus();
    if (edit) requestAnimationFrame(() => input.current?.select());
  }
  const common = {
    ...props,
    id,
    name,
    value: text,
    "aria-describedby": available ? `${id}-suggestion` : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setText(event.target.value);
      onDraftChange?.();
    },
    onKeyDown: (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (!available || event.nativeEvent.isComposing) return;
      if (event.key === "Escape") setDismissed(true);
      if (
        event.key === "Tab" &&
        !event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        accept(false);
      }
    },
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          {...(common as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          ref={(node) => {
            input.current = node;
          }}
          rows={props.rows ?? 3}
        />
      ) : (
        <input
          {...common}
          ref={(node) => {
            input.current = node;
          }}
        />
      )}
      {available && (
        <div id={`${id}-suggestion`} className={styles.suggestion}>
          <strong>Suggested draft — review before saving</strong>
          <p>{suggestion}</p>
          <p className={desk.helper}>
            Tab accepts this draft. You can then edit it. Escape keeps normal
            tab navigation. Or type your own.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={desk.secondaryButton}
              onClick={() => accept(false)}
              aria-label={`Accept suggestion for ${label}`}
            >
              Accept draft <kbd>Tab</kbd>
            </button>
            <button
              type="button"
              className={desk.textButton}
              onClick={() => accept(true)}
              aria-label={`Accept and edit suggestion for ${label}`}
            >
              Accept and edit
            </button>
            <button
              type="button"
              className={desk.textButton}
              onClick={() => {
                setDismissed(true);
                input.current?.focus();
              }}
              aria-label={`Write my own ${label}`}
            >
              Write my own
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
