import createPreset from 'conventional-changelog-conventionalcommits'

// The stock conventionalcommits preset only shows feat/fix, which would drop most
// of this repo's history from the release notes.
const preset = await createPreset({
  types: [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance' },
    { type: 'refactor', section: 'Refactoring' },
    { type: 'build', section: 'Build' },
    { type: 'ci', section: 'CI' },
    { type: 'docs', section: 'Documentation' },
    { type: 'test', hidden: true },
    { type: 'style', hidden: true },
    { type: 'chore', hidden: true }
  ]
})

// conventional-changelog-cli reads the legacy parserOpts/writerOpts keys, while the
// preset factory returns parser/writer - expose both so either shape resolves.
export default {
  ...preset,
  parserOpts: preset.parser,
  writerOpts: preset.writer
}
