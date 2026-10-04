import Link from "next/link";
import type { ReactNode } from "react";
import { Band, Page } from "@/components/page";
import "@/components/stepwell.css";
import { StepwellTilt } from "./stepwell-tilt";

export type Stop = { title: string; text: string; links: { href: string; label: string }[]; image: ReactNode };

/**
 * The home page's path drawn as a stepwell (DESIGN.md "Stepwell scene"). Each
 * slab is a radio's label; CSS shows the chosen stop's panel, so choosing
 * works without JavaScript. Screen readers get a radio group ("Careers, 1 of
 * 4"), then the chosen panel.
 */
export function StepwellScene({ intro, stops, children }: { intro: ReactNode; stops: Stop[]; children?: ReactNode }) {
  return (
    // One wrapper for band and panels: stepwell.css shows the chosen panel with
    // .stepwell:has(...), so the radios and the panels must share it.
    <div className="stepwell">
      <Band>
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
          <div className="max-w-2xl">{intro}</div>
          <div>
            <h2 id="path-heading" className="text-lg font-bold">
              The path, one step at a time
            </h2>
            <StepwellTilt>
              <fieldset className="stepwell-stage mt-6">
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
          </div>
        </div>
      </Band>
      <Page width="browse">
        {stops.map((stop, i) => (
          <div key={stop.title} data-panel={i} className="grid gap-6 sm:grid-cols-[1fr_auto] sm:gap-12">
            <div className="max-w-2xl">
              <h3 className="text-xl font-bold">
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
        {children}
      </Page>
    </div>
  );
}
