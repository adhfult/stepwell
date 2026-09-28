export type StagedRecord<T> =
  | { status: "valid"; id: string; value: T }
  | { status: "rejected"; id: string; reason: string; raw: unknown };

export type AdapterResult<T> =
  | { status: "unchanged"; release: string | null; etag: string | null }
  | { status: "fetched"; release: string | null; etag: string | null; records: StagedRecord<T>[] };
