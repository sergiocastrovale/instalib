#!/usr/bin/env node
// Regenerates binary/archive test fixtures under tests/fixtures/.
// Run manually with `node scripts/make-fixtures.mjs` after changing the
// source JSON fixtures it zips up, or if tiny.mp4/cover.jpg need regenerating.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '..', 'tests', 'fixtures')

function readFixture(name) {
  return readFileSync(join(fixturesDir, name))
}

function makeExportZip() {
  const zip = new AdmZip()
  zip.addFile(
    'your_instagram_activity/saved/saved_posts.json',
    readFixture('saved_posts.old.json')
  )
  zip.addFile(
    'your_instagram_activity/saved/saved_collections.json',
    readFixture('saved_collections.old.json')
  )
  zip.writeZip(join(fixturesDir, 'export.zip'))
  console.log('wrote export.zip')
}

function makeExportNoPostsZip() {
  const zip = new AdmZip()
  zip.addFile(
    'your_instagram_activity/saved/saved_collections.json',
    readFixture('saved_collections.old.json')
  )
  zip.writeZip(join(fixturesDir, 'export-no-posts.zip'))
  console.log('wrote export-no-posts.zip')
}

function makeTinyMp4() {
  const dest = join(fixturesDir, 'tiny.mp4')
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=blue:s=64x64:d=1:r=10',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    dest
  ])
  console.log('wrote tiny.mp4')
}

function makeCoverJpg() {
  const dest = join(fixturesDir, 'cover.jpg')
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=red:s=32x32', '-frames:v', '1', '-update', '1', dest])
  console.log('wrote cover.jpg')
}

makeExportZip()
makeExportNoPostsZip()
if (!existsSync(join(fixturesDir, 'tiny.mp4'))) makeTinyMp4()
if (!existsSync(join(fixturesDir, 'cover.jpg'))) makeCoverJpg()
