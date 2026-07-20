import { describe, expect, it } from 'vitest'
import { clampCountIn, clampRamp, rampRate, sectionColor, SECTION_COLORS } from '@/lib/sections'

describe('sectionColor', () => {
  it('cycles the palette by index', () => {
    expect(sectionColor(0)).toBe(SECTION_COLORS[0])
    expect(sectionColor(SECTION_COLORS.length)).toBe(SECTION_COLORS[0])
  })
})

describe('clampCountIn', () => {
  it('clamps to whole seconds in [0, 10]', () => {
    expect(clampCountIn(-3)).toBe(0)
    expect(clampCountIn(3.4)).toBe(3)
    expect(clampCountIn(99)).toBe(10)
    expect(clampCountIn(Number.NaN)).toBe(0)
  })
})

describe('clampRamp', () => {
  it('clamps each field to its allowed range', () => {
    expect(clampRamp({ startAt: 0.1, step: 0.001, endAt: 9, repsPerStep: 0 })).toEqual({
      startAt: 0.25,
      step: 0.05,
      endAt: 2,
      repsPerStep: 1
    })
  })

  it('never lets the target fall below the start', () => {
    expect(clampRamp({ startAt: 1.5, step: 0.05, endAt: 0.5, repsPerStep: 2 }).endAt).toBe(1.5)
  })
})

describe('rampRate', () => {
  it('steps once per rep by default and caps at endAt', () => {
    const ramp = { startAt: 0.5, step: 0.05, endAt: 0.6, repsPerStep: 1 }
    expect(rampRate(ramp, 0)).toBeCloseTo(0.5)
    expect(rampRate(ramp, 1)).toBeCloseTo(0.55)
    expect(rampRate(ramp, 2)).toBeCloseTo(0.6)
    expect(rampRate(ramp, 20)).toBeCloseTo(0.6)
  })

  it('holds the rate for repsPerStep reps before stepping', () => {
    const ramp = { startAt: 0.5, step: 0.1, endAt: 1, repsPerStep: 3 }
    expect(rampRate(ramp, 0)).toBeCloseTo(0.5)
    expect(rampRate(ramp, 2)).toBeCloseTo(0.5)
    expect(rampRate(ramp, 3)).toBeCloseTo(0.6)
    expect(rampRate(ramp, 5)).toBeCloseTo(0.6)
    expect(rampRate(ramp, 6)).toBeCloseTo(0.7)
  })
})
