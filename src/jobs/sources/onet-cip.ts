// O*NET's crosswalk from programs of study (2020 CIP) to careers (O*NET-SOC
// 2019), CC BY 4.0. Published only as Excel. Spec: docs/specs/programs-and-colleges.md.
import { readSheet } from "read-excel-file/node";
import { z } from "zod";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const CROSSWALK_URL = "https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx";
// About 8,500 rows in the 2026-09-28 file; far fewer means the file changed.
export const MIN_ROWS = 4_000;
const HEADER = ["2020 CIP Code", "2020 CIP Title", "O*NET-SOC 2019 Code", "O*NET-SOC 2019 Title"];

const rowSchema = z.object({
  cip6: z.string().regex(/^\d{2}\.\d{4}$/, "CIP code must look like 51.3801"),
  cip_title: z.string().trim().min(1).max(200),
  onet_code: z.string().regex(/^\d{2}-\d{4}\.\d{2}$/, "O*NET code must look like 29-1141.00"),
});

export type CrosswalkRow = z.infer<typeof rowSchema>;

/** Rows below the header (the file starts with two title lines), as staged records. */
export function parseCrosswalk(rows: unknown[][], minRows = MIN_ROWS): StagedRecord<CrosswalkRow>[] {
  const headerAt = rows.findIndex((row) => HEADER.every((title, i) => String(row[i] ?? "").trim() === title));
  if (headerAt === -1) throw new Error(`Crosswalk header not found (expected ${HEADER.join(", ")})`);

  const records = rows.slice(headerAt + 1).map((row, i): StagedRecord<CrosswalkRow> => {
    // Titles end with a period in the file ("Agriculture, General."); dropped for display.
    const result = rowSchema.safeParse({
      cip6: String(row[0] ?? "").trim(),
      cip_title: String(row[1] ?? "").trim().replace(/\.$/, ""),
      onet_code: String(row[2] ?? "").trim(),
    });
    const id = `row ${headerAt + i + 2}`;
    return result.success
      ? { status: "valid", id: `${result.data.onet_code} ${result.data.cip6}`, value: result.data }
      : { status: "rejected", id, reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "), raw: row };
  });

  const valid = records.filter((r) => r.status === "valid").length;
  if (valid < minRows) throw new Error(`Crosswalk has only ${valid} usable rows (expected at least ${minRows}); has the file changed?`);
  return records;
}

export async function readOnetCip(fetcher: Fetcher): Promise<AdapterResult<CrosswalkRow>> {
  const file = await fetcher.get(CROSSWALK_URL, { as: "bytes" });
  if (file.status !== 200 || !file.bytes) throw new Error(`O*NET crosswalk returned ${file.status}`);
  const rows = await readSheet(file.bytes);
  return { status: "fetched", release: null, etag: file.etag, records: parseCrosswalk(rows) };
}
