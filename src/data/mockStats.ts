// Mock player statistics for WC 2026.
// teamId / teamCode / teamFlag must match the teams in mockData.ts.
// Swap this module's export for a live-API fetch when ready.

export interface PlayerStat {
  id: string;
  name: string;
  teamId: string;
  teamCode: string;
  teamFlag: string;
  teamName: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  goals: number;
  assists: number;
  matchesPlayed: number;
  shotsOnTarget: number;
  saves: number;       // meaningful only for GK; 0 for outfield players
  yellowCards: number;
  redCards: number;
}

export const MOCK_PLAYERS: PlayerStat[] = [
  // ── Forwards / top scorers ────────────────────────────────────────────────
  {
    id: "mbappe",   name: "קיליאן מבאפה",       teamId: "fra", teamCode: "FRA", teamFlag: "🇫🇷", teamName: "צרפת",
    position: "FWD", goals: 6, assists: 3, matchesPlayed: 4, shotsOnTarget: 12, saves: 0, yellowCards: 1, redCards: 0,
  },
  {
    id: "vinicius", name: "ויניסיוס ג׳וניור",    teamId: "bra", teamCode: "BRA", teamFlag: "🇧🇷", teamName: "ברזיל",
    position: "FWD", goals: 5, assists: 2, matchesPlayed: 4, shotsOnTarget: 10, saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "muller",   name: "תומס מולר",            teamId: "ger", teamCode: "GER", teamFlag: "🇩🇪", teamName: "גרמניה",
    position: "FWD", goals: 4, assists: 4, matchesPlayed: 4, shotsOnTarget: 7,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "lautaro",  name: "לאוטארו מרטינס",       teamId: "arg", teamCode: "ARG", teamFlag: "🇦🇷", teamName: "ארגנטינה",
    position: "FWD", goals: 4, assists: 1, matchesPlayed: 4, shotsOnTarget: 8,  saves: 0, yellowCards: 1, redCards: 0,
  },
  {
    id: "morata",   name: "אלוארו מוראטה",        teamId: "esp", teamCode: "ESP", teamFlag: "🇪🇸", teamName: "ספרד",
    position: "FWD", goals: 4, assists: 0, matchesPlayed: 4, shotsOnTarget: 6,  saves: 0, yellowCards: 2, redCards: 0,
  },
  {
    id: "kane",     name: "הארי קיין",             teamId: "eng", teamCode: "ENG", teamFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", teamName: "אנגליה",
    position: "FWD", goals: 3, assists: 1, matchesPlayed: 4, shotsOnTarget: 7,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "pulisic",  name: "כריסטיאן פוליסיק",     teamId: "usa", teamCode: "USA", teamFlag: "🇺🇸", teamName: "ארצות הברית",
    position: "FWD", goals: 3, assists: 2, matchesPlayed: 4, shotsOnTarget: 7,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "lukaku",   name: "רומלו לוקאקו",          teamId: "bel", teamCode: "BEL", teamFlag: "🇧🇪", teamName: "בלגיה",
    position: "FWD", goals: 3, assists: 0, matchesPlayed: 4, shotsOnTarget: 5,  saves: 0, yellowCards: 1, redCards: 0,
  },
  {
    id: "chiesa",   name: "פדריקו קיאזה",          teamId: "ita", teamCode: "ITA", teamFlag: "🇮🇹", teamName: "איטליה",
    position: "FWD", goals: 2, assists: 1, matchesPlayed: 3, shotsOnTarget: 5,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "son",      name: "סון הונג-מין",           teamId: "kor", teamCode: "KOR", teamFlag: "🇰🇷", teamName: "קוריאה הדרומית",
    position: "FWD", goals: 2, assists: 3, matchesPlayed: 3, shotsOnTarget: 5,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "jimenez",  name: "ראול חימנס",            teamId: "mex", teamCode: "MEX", teamFlag: "🇲🇽", teamName: "מקסיקו",
    position: "FWD", goals: 2, assists: 1, matchesPlayed: 3, shotsOnTarget: 4,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "mane",     name: "סאדיו מאנה",            teamId: "sen", teamCode: "SEN", teamFlag: "🇸🇳", teamName: "סנגל",
    position: "FWD", goals: 2, assists: 2, matchesPlayed: 3, shotsOnTarget: 5,  saves: 0, yellowCards: 1, redCards: 0,
  },
  {
    id: "suarez",   name: "לואיס סוארס",           teamId: "ury", teamCode: "URY", teamFlag: "🇺🇾", teamName: "אורוגוואי",
    position: "FWD", goals: 2, assists: 0, matchesPlayed: 3, shotsOnTarget: 3,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "falcao",   name: "פלקאו גרסיה",           teamId: "col", teamCode: "COL", teamFlag: "🇨🇴", teamName: "קולומביה",
    position: "FWD", goals: 2, assists: 0, matchesPlayed: 3, shotsOnTarget: 4,  saves: 0, yellowCards: 1, redCards: 0,
  },
  {
    id: "depay",    name: "ממפיס דפאי",            teamId: "nld", teamCode: "NLD", teamFlag: "🇳🇱", teamName: "הולנד",
    position: "FWD", goals: 2, assists: 1, matchesPlayed: 3, shotsOnTarget: 4,  saves: 0, yellowCards: 1, redCards: 0,
  },
  // ── Midfielders / playmakers ──────────────────────────────────────────────
  {
    id: "bfernandes", name: "ברונו פרננדס",        teamId: "por", teamCode: "POR", teamFlag: "🇵🇹", teamName: "פורטוגל",
    position: "MID", goals: 3, assists: 3, matchesPlayed: 4, shotsOnTarget: 6,  saves: 0, yellowCards: 1, redCards: 0,
  },
  {
    id: "debruyne",  name: "קווין דה-ברויינה",      teamId: "bel", teamCode: "BEL", teamFlag: "🇧🇪", teamName: "בלגיה",
    position: "MID", goals: 1, assists: 5, matchesPlayed: 4, shotsOnTarget: 4,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "modric",    name: "לוקה מודריץ׳",          teamId: "cro", teamCode: "CRO", teamFlag: "🇭🇷", teamName: "קרואטיה",
    position: "MID", goals: 1, assists: 3, matchesPlayed: 3, shotsOnTarget: 3,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "calhanoglu", name: "האקאן צ׳אלחאנוגלו",   teamId: "tur", teamCode: "TUR", teamFlag: "🇹🇷", teamName: "טורקיה",
    position: "MID", goals: 1, assists: 1, matchesPlayed: 3, shotsOnTarget: 3,  saves: 0, yellowCards: 3, redCards: 0,
  },
  {
    id: "ziyech",    name: "חכים זייש",             teamId: "mar", teamCode: "MAR", teamFlag: "🇲🇦", teamName: "מרוקו",
    position: "MID", goals: 1, assists: 2, matchesPlayed: 3, shotsOnTarget: 3,  saves: 0, yellowCards: 0, redCards: 0,
  },
  {
    id: "minamino",  name: "טאקומי מינאמינו",       teamId: "jpn", teamCode: "JPN", teamFlag: "🇯🇵", teamName: "יפן",
    position: "MID", goals: 1, assists: 1, matchesPlayed: 2, shotsOnTarget: 2,  saves: 0, yellowCards: 0, redCards: 0,
  },
  // ── Defenders ─────────────────────────────────────────────────────────────
  {
    id: "estupinan", name: "פרביס אסטופיניאן",      teamId: "ecu", teamCode: "ECU", teamFlag: "🇪🇨", teamName: "אקוודור",
    position: "DEF", goals: 1, assists: 2, matchesPlayed: 3, shotsOnTarget: 2,  saves: 0, yellowCards: 2, redCards: 0,
  },
  {
    id: "vertonghen", name: "יאן ורטונגן",           teamId: "bel", teamCode: "BEL", teamFlag: "🇧🇪", teamName: "בלגיה",
    position: "DEF", goals: 0, assists: 0, matchesPlayed: 4, shotsOnTarget: 0,  saves: 0, yellowCards: 3, redCards: 0,
  },
  {
    id: "otamendi",  name: "ניקולס אוטמנדי",        teamId: "arg", teamCode: "ARG", teamFlag: "🇦🇷", teamName: "ארגנטינה",
    position: "DEF", goals: 0, assists: 0, matchesPlayed: 4, shotsOnTarget: 0,  saves: 0, yellowCards: 3, redCards: 1,
  },
  {
    id: "alba",      name: "ז׳ורדי אלבה",           teamId: "esp", teamCode: "ESP", teamFlag: "🇪🇸", teamName: "ספרד",
    position: "DEF", goals: 0, assists: 2, matchesPlayed: 4, shotsOnTarget: 1,  saves: 0, yellowCards: 2, redCards: 0,
  },
  // ── Goalkeepers ───────────────────────────────────────────────────────────
  {
    id: "alisson",   name: "אלישון בקר",            teamId: "bra", teamCode: "BRA", teamFlag: "🇧🇷", teamName: "ברזיל",
    position: "GK",  goals: 0, assists: 0, matchesPlayed: 4, shotsOnTarget: 0,  saves: 16, yellowCards: 0, redCards: 0,
  },
  {
    id: "neuer",     name: "מנואל נויאר",            teamId: "ger", teamCode: "GER", teamFlag: "🇩🇪", teamName: "גרמניה",
    position: "GK",  goals: 0, assists: 0, matchesPlayed: 4, shotsOnTarget: 0,  saves: 14, yellowCards: 0, redCards: 0,
  },
  {
    id: "pickford",  name: "ג׳ורדן פיקפורד",        teamId: "eng", teamCode: "ENG", teamFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", teamName: "אנגליה",
    position: "GK",  goals: 0, assists: 0, matchesPlayed: 4, shotsOnTarget: 0,  saves: 13, yellowCards: 0, redCards: 0,
  },
  {
    id: "lloris",    name: "הוגו לוריס",             teamId: "fra", teamCode: "FRA", teamFlag: "🇫🇷", teamName: "צרפת",
    position: "GK",  goals: 0, assists: 0, matchesPlayed: 4, shotsOnTarget: 0,  saves: 11, yellowCards: 0, redCards: 0,
  },
  {
    id: "unai",      name: "אונאי סימון",            teamId: "esp", teamCode: "ESP", teamFlag: "🇪🇸", teamName: "ספרד",
    position: "GK",  goals: 0, assists: 0, matchesPlayed: 4, shotsOnTarget: 0,  saves: 8,  yellowCards: 0, redCards: 0,
  },
  {
    id: "schmeichel", name: "קספר שמייקל",           teamId: "dnk", teamCode: "DNK", teamFlag: "🇩🇰", teamName: "דנמרק",
    position: "GK",  goals: 0, assists: 0, matchesPlayed: 3, shotsOnTarget: 0,  saves: 9,  yellowCards: 0, redCards: 0,
  },
];
