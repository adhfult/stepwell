/**
 * Official ACT/SAT concordance (ACT and College Board, 2018), copied from
 * ACT's ACT-SAT-Concordance-Tables.pdf. Still the current official table
 * (the digital SAT kept the same scale); ACT's 2025 composite has no newer one.
 *
 * Table A2 per ACT composite: the single-point SAT and the low end of its
 * SAT range. Table A1 (SAT to ACT) gives each ACT score exactly that range,
 * so one list answers both directions.
 */
const TABLE: [act: number, sat: number, satLow: number][] = [
  [36, 1590, 1570], [35, 1540, 1530], [34, 1500, 1490], [33, 1460, 1450], [32, 1430, 1420],
  [31, 1400, 1390], [30, 1370, 1360], [29, 1340, 1330], [28, 1310, 1300], [27, 1280, 1260],
  [26, 1240, 1230], [25, 1210, 1200], [24, 1180, 1160], [23, 1140, 1130], [22, 1110, 1100],
  [21, 1080, 1060], [20, 1040, 1030], [19, 1010, 990], [18, 970, 960], [17, 930, 920],
  [16, 890, 880], [15, 850, 830], [14, 800, 780], [13, 760, 730], [12, 710, 690],
  [11, 670, 650], [10, 630, 620], [9, 590, 590],
];

export const CONCORDANCE_SOURCE =
  "Source: ACT and College Board concordance tables (2018), the current official table. ACT’s 2025 composite has no newer table yet.";

/** ACT composite to SAT total (Table A2); null below 9, which the table doesn't cover. */
export const actToSat = (act: number) => TABLE.find((row) => row[0] === act)?.[1] ?? null;

/** SAT total to ACT composite (Table A1); null below 590. */
export const satToAct = (sat: number) => TABLE.find((row) => sat >= row[2])?.[0] ?? null;
