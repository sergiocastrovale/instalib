export const SECTION_COLORS = [
  '#5b8def',
  '#e5674f',
  '#4ade80',
  '#facc15',
  '#c084fc',
  '#38bdf8',
  '#fb923c',
  '#f472b6'
]

export function sectionColor(index: number): string {
  return SECTION_COLORS[index % SECTION_COLORS.length]
}
