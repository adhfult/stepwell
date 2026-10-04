import type { ReactNode } from "react";
import { Band } from "@/components/page";
import "@/components/stepwell.css";
import { StepwellTilt } from "./stepwell-tilt";

/**
 * The home page's hero: intro on the left, the path drawn as a stepwell on
 * the right (DESIGN.md "Stepwell scene"). Each slab links to its step's
 * section further down the page; the first slab is raised as "you are here".
 */
export function StepwellScene({ intro, steps }: { intro: ReactNode; steps: string[] }) {
  return (
    <Band>
      <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
        <div className="max-w-2xl">{intro}</div>
        <nav aria-labelledby="path-heading">
          <h2 id="path-heading" className="text-lg font-bold">
            The path, one step at a time
          </h2>
          <StepwellTilt>
            <div className="stepwell-stage mt-6">
              <div className="stepwell-scene">
                {steps.map((title, i) => (
                  <a key={title} href={`#step-${i + 1}`} className={`stepwell-slab${i === 0 ? " is-here" : ""}`}>
                    <span aria-hidden="true" className="stepwell-route" />
                    <span aria-hidden="true" className="stepwell-stone" />
                    <span className="stepwell-sign">
                      <span className="sr-only">Step {i + 1}: </span>
                      {title}
                      {i === 0 && <span className="stepwell-here">You are here</span>}
                    </span>
                  </a>
                ))}
                <span aria-hidden="true" className="stepwell-water" />
              </div>
            </div>
          </StepwellTilt>
        </nav>
      </div>
    </Band>
  );
}
