import { unlink } from 'node:fs/promises'
import { extname } from 'node:path'

export async function unlinkQuiet(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch {
    // already gone / never existed - fine
  }
}

export function infoJsonPath(filePath: string): string {
  const ext = extname(filePath)
  return ext ? `${filePath.slice(0, -ext.length)}.info.json` : `${filePath}.info.json`
}
