"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/components/button-styles";
import { ErrorSummary, SubmitButton, type SummaryItem } from "@/components/form";
import { ANSWER_OPTIONS } from "@/lib/interests/labels";
import type { Question } from "@/lib/interests/data";
import { scoreQuiz } from "./actions";
import { initialQuizState } from "./state";

const PER_PAGE = 12;

const missingItems = (numbers: number[]): SummaryItem[] =>
  numbers.map((n) => ({ fieldId: `q${n}-1`, message: `Answer question ${n}` }));

/**
 * The 60 questions as 5 pages of 12 (DESIGN.md "Form fields": a fieldset per
 * question, the browser's own radio buttons, 44px targets). One form holds
 * every page (other pages are hidden, not removed, so answers are kept), so
 * "See my results" sends all 60 answers at once. The server checks them again.
 */
export function QuizForm({ questions }: { questions: Question[] }) {
  const [state, action] = useActionState(scoreQuiz, initialQuizState);
  const [page, setPage] = useState(0);
  const [pageMissing, setPageMissing] = useState<number[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pages = Math.ceil(questions.length / PER_PAGE);

  // Problems from this page's check, or (rarely) from the server's.
  const serverItems = useMemo(() => missingItems(state.missing), [state]);
  const pageItems = useMemo(() => missingItems(pageMissing), [pageMissing]);

  const unanswered = (onPage: number) =>
    questions
      .slice(onPage * PER_PAGE, (onPage + 1) * PER_PAGE)
      .filter((q) => !new FormData(formRef.current!).get(`q${q.index}`))
      .map((q) => q.index);

  const goTo = (next: number) => {
    setPageMissing([]);
    setPage(next);
    // Start the new page at its heading, for keyboard and screen reader users too.
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: "start" });
    });
  };

  const onPageDone = (event: React.MouseEvent | React.FormEvent) => {
    const missing = unanswered(page);
    if (missing.length > 0) {
      event.preventDefault();
      setPageMissing(missing);
      return false;
    }
    return true;
  };

  return (
    <form ref={formRef} action={action} className="mt-8" onSubmit={onPageDone}>
      <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-4 text-lg font-bold focus:outline-none">
        Page {page + 1} of {pages}
      </h2>
      <div className="mt-4">
        <ErrorSummary items={pageItems.length > 0 ? pageItems : serverItems} />
        {state.error && <p className="mt-4 text-accent">Error: {state.error}</p>}
      </div>

      <ol className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
        {questions.map((q) => {
          const onThisPage = Math.floor((q.index - 1) / PER_PAGE) === page;
          const isMissing = pageMissing.includes(q.index) || state.missing.includes(q.index);
          return (
            <li key={q.index} hidden={!onThisPage} className="py-4">
              <fieldset aria-describedby={isMissing ? `q${q.index}-error` : undefined}>
                <legend className="font-bold">
                  {q.index}. {q.text}
                </legend>
                {isMissing && (
                  <p id={`q${q.index}-error`} className="mt-1 text-accent">
                    Error: Choose an answer
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-5">
                  {ANSWER_OPTIONS.map((option) => (
                    <label key={option.value} className="inline-flex min-h-11 items-center gap-2">
                      <input
                        type="radio"
                        id={`q${q.index}-${option.value}`}
                        name={`q${q.index}`}
                        value={option.value}
                        className="size-6"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap gap-4">
        {page > 0 && (
          <button type="button" className={buttonClass("secondary")} onClick={() => goTo(page - 1)}>
            Back
          </button>
        )}
        {page < pages - 1 ? (
          <button type="button" className={buttonClass()} onClick={(event) => onPageDone(event) && goTo(page + 1)}>
            Next
          </button>
        ) : (
          <SubmitButton pendingLabel="Working out your results">See my results</SubmitButton>
        )}
      </div>
    </form>
  );
}
