import { Team, Group, Match } from "../types";

// ─── Teams (48 teams, 12 groups A–L) ─────────────────────────────────────────

const TEAMS_BY_GROUP: Record<string, Team[]> = {
  A: [
    { id: "ger", name: "גרמניה",            code: "GER", flag: "🇩🇪", strengthRating: 92 },
    { id: "esp", name: "ספרד",              code: "ESP", flag: "🇪🇸", strengthRating: 91 },
    { id: "jpn", name: "יפן",               code: "JPN", flag: "🇯🇵", strengthRating: 78 },
    { id: "bih", name: "בוסניה",            code: "BIH", flag: "🇧🇦", strengthRating: 72 },
  ],
  B: [
    { id: "fra", name: "צרפת",              code: "FRA", flag: "🇫🇷", strengthRating: 93 },
    { id: "nld", name: "הולנד",             code: "NLD", flag: "🇳🇱", strengthRating: 87 },
    { id: "sen", name: "סנגל",              code: "SEN", flag: "🇸🇳", strengthRating: 81 },
    { id: "uae", name: "איחוד האמירויות",   code: "UAE", flag: "🇦🇪", strengthRating: 68 },
  ],
  C: [
    { id: "arg", name: "ארגנטינה",          code: "ARG", flag: "🇦🇷", strengthRating: 89 },
    { id: "ita", name: "איטליה",            code: "ITA", flag: "🇮🇹", strengthRating: 85 },
    { id: "mar", name: "מרוקו",             code: "MAR", flag: "🇲🇦", strengthRating: 79 },
    { id: "per", name: "פרו",               code: "PER", flag: "🇵🇪", strengthRating: 75 },
  ],
  D: [
    { id: "bra", name: "ברזיל",             code: "BRA", flag: "🇧🇷", strengthRating: 94 },
    { id: "por", name: "פורטוגל",           code: "POR", flag: "🇵🇹", strengthRating: 84 },
    { id: "col", name: "קולומביה",          code: "COL", flag: "🇨🇴", strengthRating: 82 },
    { id: "nzl", name: "ניו זילנד",         code: "NZL", flag: "🇳🇿", strengthRating: 70 },
  ],
  E: [
    { id: "bel", name: "בלגיה",             code: "BEL", flag: "🇧🇪", strengthRating: 88 },
    { id: "eng", name: "אנגליה",            code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", strengthRating: 86 },
    { id: "swe", name: "שוודיה",            code: "SWE", flag: "🇸🇪", strengthRating: 76 },
    { id: "kaz", name: "קזחסטן",            code: "KAZ", flag: "🇰🇿", strengthRating: 65 },
  ],
  F: [
    { id: "mex", name: "מקסיקו",            code: "MEX", flag: "🇲🇽", strengthRating: 83 },
    { id: "ury", name: "אורוגוואי",         code: "URY", flag: "🇺🇾", strengthRating: 80 },
    { id: "par", name: "פרגוואי",           code: "PAR", flag: "🇵🇾", strengthRating: 73 },
    { id: "gbp", name: "ניו קלדוניה",       code: "NCL", flag: "🇵🇫", strengthRating: 55 },
  ],
  G: [
    { id: "cro", name: "קרואטיה",           code: "CRO", flag: "🇭🇷", strengthRating: 81 },
    { id: "tur", name: "טורקיה",            code: "TUR", flag: "🇹🇷", strengthRating: 77 },
    { id: "nor", name: "נורווגיה",          code: "NOR", flag: "🇳🇴", strengthRating: 74 },
    { id: "isr", name: "ישראל",             code: "ISR", flag: "🇮🇱", strengthRating: 72 },
  ],
  H: [
    { id: "dnk", name: "דנמרק",             code: "DNK", flag: "🇩🇰", strengthRating: 79 },
    { id: "ech", name: "צ'כיה",             code: "CZE", flag: "🇨🇿", strengthRating: 75 },
    { id: "sct", name: "סקוטלנד",           code: "SCT", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", strengthRating: 71 },
    { id: "hun", name: "הונגריה",           code: "HUN", flag: "🇭🇺", strengthRating: 69 },
  ],
  I: [
    { id: "ecu", name: "אקוודור",           code: "ECU", flag: "🇪🇨", strengthRating: 76 },
    { id: "can", name: "קנדה",              code: "CAN", flag: "🇨🇦", strengthRating: 74 },
    { id: "cos", name: "קוסטה ריקה",        code: "CRC", flag: "🇨🇷", strengthRating: 73 },
    { id: "pan", name: "פנמה",              code: "PAN", flag: "🇵🇦", strengthRating: 64 },
  ],
  J: [
    { id: "kor", name: "קוריאה הדרומית",    code: "KOR", flag: "🇰🇷", strengthRating: 77 },
    { id: "tha", name: "תאילנד",            code: "THA", flag: "🇹🇭", strengthRating: 68 },
    { id: "idn", name: "אינדונזיה",         code: "IDN", flag: "🇮🇩", strengthRating: 62 },
    { id: "vtn", name: "וייטנאם",           code: "VTN", flag: "🇻🇳", strengthRating: 63 },
  ],
  K: [
    { id: "usa", name: "ארצות הברית",       code: "USA", flag: "🇺🇸", strengthRating: 82 },
    { id: "aus", name: "אוסטרליה",          code: "AUS", flag: "🇦🇺", strengthRating: 75 },
    { id: "irn", name: "איראן",             code: "IRN", flag: "🇮🇷", strengthRating: 70 },
    { id: "omn", name: "עומאן",             code: "OMN", flag: "🇴🇲", strengthRating: 61 },
  ],
  L: [
    { id: "ukr", name: "אוקראינה",          code: "UKR", flag: "🇺🇦", strengthRating: 76 },
    { id: "pol", name: "פולין",             code: "POL", flag: "🇵🇱", strengthRating: 73 },
    { id: "wal", name: "וויילס",            code: "WAL", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", strengthRating: 68 },
    { id: "alb", name: "אלבניה",            code: "ALB", flag: "🇦🇱", strengthRating: 66 },
  ],
};

export const GROUPS: Group[] = Object.entries(TEAMS_BY_GROUP).map(([id, teams]) => ({
  id,
  name: id,
  teams,
}));

// ─── Deterministic match generation ──────────────────────────────────────────
// No Math.random() — results are fully reproducible.

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** Returns a stable [0,99] integer for a given match key. */
function matchSeed(homeId: string, awayId: string, day: number): number {
  return djb2(`${homeId}|${awayId}|${day}`) % 100;
}

function scoreFromSeed(
  seed: number,
  homeStr: number,
  awayStr: number
): [number, number] {
  const diff = homeStr - awayStr;
  // Multiplier 4.0 makes big strength gaps decisive (~72% for 14-pt gap).
  const bias = diff * 4.0 + 5;
  const effective = seed + bias;

  if (effective > 60) {
    // Home wins. Stronger teams win by more goals (1 extra goal per 15-pt gap).
    const extra = Math.floor(Math.max(0, diff) / 15);
    const hs = Math.min(5, 1 + (seed % 3) + extra);
    const as = Math.min(hs - 1, Math.max(0, (seed >> 2) % Math.max(1, hs - extra)));
    return [hs, as];
  } else if (effective < 35) {
    // Away wins. Same logic reversed.
    const extra = Math.floor(Math.max(0, -diff) / 15);
    const as = Math.min(5, 1 + (seed % 3) + extra);
    const hs = Math.min(as - 1, Math.max(0, (seed >> 2) % Math.max(1, as - extra)));
    return [hs, as];
  } else {
    // Draw
    const g = seed % 3;
    return [g, g];
  }
}

/**
 * Match-day assignment for the standard round-robin (groups of 4).
 * i < j, both in [0,3].
 */
function matchDay(i: number, j: number): number {
  if ((i === 0 && j === 1) || (i === 2 && j === 3)) return 1;
  if ((i === 0 && j === 2) || (i === 1 && j === 3)) return 2;
  return 3; // (0,3) and (1,2)
}

// Approximate dates by matchday
const MD_DATES: Record<number, string> = {
  1: "2026-06-13",
  2: "2026-06-18",
  3: "2026-06-23",
};

function generateMatches(): Match[] {
  const matches: Match[] = [];
  let id = 1;

  for (const [groupId, teams] of Object.entries(TEAMS_BY_GROUP)) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const home = teams[i];
        const away = teams[j];
        const day = matchDay(i, j);
        const played = day < 3; // matchdays 1 & 2 are completed

        let homeScore: number | undefined;
        let awayScore: number | undefined;

        if (played) {
          const seed = matchSeed(home.id, away.id, day);
          [homeScore, awayScore] = scoreFromSeed(seed, home.strengthRating, away.strengthRating);
        }

        matches.push({
          id: `m${id++}`,
          groupId,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore,
          awayScore,
          status: played ? "played" : "unplayed",
          matchDay: day,
          date: MD_DATES[day],
        });
      }
    }
  }

  return matches;
}

export const MOCK_MATCHES: Match[] = generateMatches();

export function getMockTournamentData() {
  return { groups: GROUPS, matches: MOCK_MATCHES };
}
