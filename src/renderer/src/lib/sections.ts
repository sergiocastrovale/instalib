import type { SectionRamp } from '@shared/types'

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

export const DEFAULT_RAMP: SectionRamp = { startAt: 0.5, step: 0.05, endAt: 1, repsPerStep: 1 }

export const MAX_COUNT_IN_SEC = 10

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, v))
}

export function clampCountIn(sec: number): number {
  return Math.round(clamp(sec, 0, MAX_COUNT_IN_SEC))
}

export function clampRamp(ramp: SectionRamp): SectionRamp {
  const startAt = clamp(ramp.startAt, 0.25, 2)
  return {
    startAt,
    step: clamp(ramp.step, 0.05, 0.5),
    endAt: Math.max(startAt, clamp(ramp.endAt, 0.25, 2)),
    repsPerStep: Math.round(clamp(ramp.repsPerStep, 1, 20))
  }
}

// playback rate for a given completed-rep count: rep 0 plays at startAt, each
// full repsPerStep block adds one step, capped at endAt
export function rampRate(ramp: SectionRamp, rep: number): number {
  const steps = Math.floor(rep / Math.max(1, ramp.repsPerStep))
  return Math.min(ramp.endAt, ramp.startAt + steps * ramp.step)
}
