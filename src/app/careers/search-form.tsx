import { buttonClass } from "@/components/button-styles";
import { SEARCH_MAX } from "@/lib/careers/labels";

/**
 * Career search: a plain GET form (/careers?q=nurse), so results can be
 * bookmarked and shared. DESIGN.md "Form fields": label
 * above, 44px controls; the button sits beside the field from 640px.
 */
/** `id` only changes when a page shows the form twice (the home page). */
export function CareerSearchForm({ query = "", error, id = "q" }: { query?: string; error?: string; id?: string }) {
  return (
    <form action="/careers" method="get" role="search" className="mt-6">
      <label htmlFor={id} className="block font-bold">
        Search careers
      </label>
      <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
        A job title or a word, like “nurse” or “electrician”.
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={query}
          maxLength={SEARCH_MAX}
          aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
          aria-invalid={error ? true : undefined}
          className={`block min-h-11 w-full rounded-control bg-surface px-3 text-base text-foreground ${
            error ? "border-2 border-accent" : "border border-border-strong"
          }`}
        />
        <button type="submit" className={`${buttonClass()} justify-center`}>
          Search
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-accent">
          Error: {error}
        </p>
      )}
    </form>
  );
}
