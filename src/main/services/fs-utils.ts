import { unlink } from 'node:fs/promises'

export async function unlinkQuiet(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch {
    // already gone / never existed — fine
  }
}
