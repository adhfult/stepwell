"use client";

import { useActionState } from "react";
import { SelectField, SubmitButton, TextField } from "@/components/form";
import type { PlanItem } from "@/lib/plan/data";
import { KINDS, TERMS } from "@/lib/plan/labels";
import { addPlanItem, updatePlanItem } from "./actions";
import { initialActionState } from "./state";

const select =
  "mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground";

/** Add a plan item, or edit one (moving it is changing its year and term). */
export function PlanItemForm({
  item,
  years,
}: {
  item?: PlanItem;
  /** School years to offer, with their headings. */
  years: { value: string; label: string }[];
}) {
  const [state, action] = useActionState(item ? updatePlanItem : addPlanItem, initialActionState);
  const key = item?.id ?? "new";
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="mt-4 space-y-4" noValidate>
      {item && <input type="hidden" name="id" value={item.id} />}
      <TextField
        id={`title-${key}`}
        name="title"
        label="What you plan to do"
        hint="For example, “Take AP Biology” or “Visit two colleges”. Don’t include private details."
        defaultValue={v?.title ?? item?.title}
        maxLength={200}
        required
        error={errors.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`year-${key}`}
          name="academic_year"
          label="School year"
          placeholder="No set year"
          options={years}
          defaultValue={v?.academic_year ?? (item ? (item.academic_year?.toString() ?? "") : years[0]?.value)}
        />
        <div>
          <label htmlFor={`term-${key}`} className="block font-bold">
            When in the year
          </label>
          <select id={`term-${key}`} name="term" defaultValue={v?.term ?? item?.term ?? "full_year"} className={select}>
            {TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`kind-${key}`} className="block font-bold">
            Kind
          </label>
          <select id={`kind-${key}`} name="kind" defaultValue={v?.kind ?? item?.kind ?? "task"} className={select}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id={`due-${key}`}
          name="due_on"
          type="date"
          label="Due date (optional)"
          defaultValue={v?.due_on ?? item?.due_on ?? ""}
          error={errors.due_on}
        />
      </div>
      <SubmitButton variant={item ? "secondary" : "primary"} pendingLabel={item ? "Saving" : "Adding"}>
        {item ? "Save changes" : "Add to plan"}
      </SubmitButton>
      {state.error && (
        <p role="alert" className="text-accent">
          Error: {state.error}
        </p>
      )}
    </form>
  );
}
