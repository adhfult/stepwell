import Link from "next/link";
import type { ReactNode } from "react";
import "@/components/stepwell.css";
import { StepwellTilt } from "./stepwell-tilt";

export type Stop = { title: string; text: string; links: { href: string; label: string }[]; image: ReactNode };

/**
 * The home page's path drawn as a stepwell (DESIGN.md "Stepwell scene"). Each
 * slab is a radio's label; CSS shows the chosen stop's panel, so choosing
 * works without JavaScript. Screen readers get a radio group ("Careers, 1 of
 * 4"), then the chosen panel.
 */
export function StepwellScene({ stops }: { stops: Stop[] }) {
  return (
    <section aria-labelledby="path-heading" className="stepwell mt-16">
      <h2 id="path-heading" className="text-lg font-bold">
        The path, one step at a time
      </h2>
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
        <StepwellTilt>
          <fieldset className="stepwell-stage">
            <legend className="sr-only">Choose a step to see what Stepwell shows there</legend>
            <div className="stepwell-scene">
              {stops.map((stop, i) => (
                <label key={stop.title} className="stepwell-slab">
                  <input type="radio" name="step" value={i} defaultChecked={i === 0} className="sr-only" />
                  <span aria-hidden="true" className="stepwell-route" />
                  <span aria-hidden="true" className="stepwell-stone" />
                  <span className="stepwell-sign">
                    {stop.title}
                    <span aria-hidden="true" className="stepwell-here">
                      You are here
                    </span>
                  </span>
                </label>
              ))}
              <span aria-hidden="true" className="stepwell-water" />
            </div>
          </fieldset>
        </StepwellTilt>
        <div>
          {stops.map((stop, i) => (
            <div key={stop.title} data-panel={i} className="grid gap-6 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
              <div>
                <h3 className="text-lg font-bold">
                  <span className="sr-only">
                    Step {i + 1} of {stops.length}:{" "}
                  </span>
                  {stop.title}
                </h3>
                <p className="mt-2">{stop.text}</p>
                <ul className="mt-2">
                  {stop.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="inline-flex min-h-11 items-center">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {stop.image}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
