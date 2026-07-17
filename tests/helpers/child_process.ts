import { EventEmitter } from 'node:events'
import { vi } from 'vitest'

export class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  kill = vi.fn()
}

interface ScriptedResult {
  stdout?: string
  stderr?: string
  code?: number | null
  error?: Error
}

/**
 * Returns a FakeChildProcess that emits the scripted stdout/stderr/close (or
 * error) on a setTimeout(0) tick rather than a real microtask - this keeps it
 * on the same clock as `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync` in
 * callers that fake timers, instead of racing a real microtask against them.
 */
export function scriptedProcess(result: ScriptedResult): FakeChildProcess {
  const proc = new FakeChildProcess()
  setTimeout(() => {
    if (result.error) {
      proc.emit('error', result.error)
      return
    }
    if (result.stdout) proc.stdout.emit('data', Buffer.from(result.stdout))
    if (result.stderr) proc.stderr.emit('data', Buffer.from(result.stderr))
    proc.emit('close', result.code ?? 0)
  }, 0)
  return proc
}

/** Returns a FakeChildProcess whose lifecycle you drive manually via close()/error(). */
export function manualProcess(): FakeChildProcess & { close: (code: number | null) => void } {
  const proc = new FakeChildProcess() as FakeChildProcess & { close: (code: number | null) => void }
  proc.close = (code: number | null) => proc.emit('close', code)
  return proc
}
