/**
 * Renders a knockout bracket slot label with the group letter wrapped in
 * dir="ltr" so that BiDi does not reorder the Latin letter to the visual
 * start of the string in an RTL context.
 *
 *   "1F"           → מנצחת בית F
 *   "2C"           → מקום שני בית C
 *   "3A/B/C/D/F"   → מקום שלישי (A/B/C/D/F)
 *
 * This is the single source of truth for slot-label display across
 * the Bracket list and the Road To Final tree.
 */
export function SlotLabel({ slot }: { slot: string }) {
  if (!slot) return <>—</>;

  const m1 = /^1([A-L])$/.exec(slot);
  if (m1) return <>מנצחת בית <span dir="ltr">{m1[1]}</span></>;

  const m2 = /^2([A-L])$/.exec(slot);
  if (m2) return <>מקום שני בית <span dir="ltr">{m2[1]}</span></>;

  if (slot.startsWith("3")) {
    return <>מקום שלישי (<span dir="ltr">{slot.slice(1)}</span>)</>;
  }

  return <>{slot}</>;
}
