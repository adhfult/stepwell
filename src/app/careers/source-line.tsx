import { monthYear } from "@/lib/careers/labels";

/**
 * Pay and outlook come from BLS through O*NET Web Services, whose terms ask
 * for a link to O*NET Web Services near the data.
 */
export function OutlookSource({ retrievedAt }: { retrievedAt: string }) {
  return (
    <p className="mt-4 text-sm text-muted">
      Source: U.S. Bureau of Labor Statistics wage estimates and 2024 to 2034 employment projections, from{" "}
      <a href="https://services.onetcenter.org/">O*NET Web Services</a> by USDOL/ETA, retrieved{" "}
      {monthYear(retrievedAt)}. Used under the <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0 license</a>.
    </p>
  );
}

/**
 * O*NET's CC BY 4.0 attribution (DESIGN.md "Sources"): the release and
 * owner, the license link, a note that Stepwell shows a selection (CC BY asks
 * us to say when data is changed), and O*NET's trademark notice.
 */
export function OnetSource({ release, retrievedAt }: { release: string; retrievedAt: string }) {
  return (
    <p className="mt-8 text-sm text-muted">
      Source: O*NET {release} Database by the U.S. Department of Labor, Employment and Training Administration
      (USDOL/ETA), retrieved {monthYear(retrievedAt)}. Used under the{" "}
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0 license</a>; Stepwell shows a selection of
      this data. O*NET is a trademark of USDOL/ETA.
    </p>
  );
}
