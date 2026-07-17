import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ImportDropzone from '@/components/ImportDropzone.vue'

describe('ImportDropzone', () => {
  it('imports a file selected via the file input and emits "imported" on success', async () => {
    const file = new File(['zip bytes'], 'export.zip', { type: 'application/zip' })
    vi.mocked(window.api.getPathForFile).mockReturnValue('/tmp/export.zip')
    vi.mocked(window.api.importZip).mockResolvedValue({ imported: 3, updated: 1, total: 4, collections: 1 })

    const wrapper = mount(ImportDropzone)
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(window.api.importZip).toHaveBeenCalledWith('/tmp/export.zip')
    expect(wrapper.emitted('imported')?.[0]).toEqual([{ imported: 3, updated: 1, total: 4, collections: 1 }])
  })

  it('imports a file dropped onto the dropzone', async () => {
    const file = new File(['zip bytes'], 'export.zip', { type: 'application/zip' })
    vi.mocked(window.api.getPathForFile).mockReturnValue('/tmp/dropped.zip')
    vi.mocked(window.api.importZip).mockResolvedValue({ imported: 1, updated: 0, total: 1, collections: 0 })

    const wrapper = mount(ImportDropzone)
    await wrapper.find('label').trigger('drop', { dataTransfer: { files: [file] } })
    await flushPromises()

    expect(window.api.importZip).toHaveBeenCalledWith('/tmp/dropped.zip')
    expect(wrapper.emitted('imported')).toBeTruthy()
  })

  it('does not emit "imported" when importZip rejects', async () => {
    const file = new File(['bad'], 'bad.zip')
    vi.mocked(window.api.getPathForFile).mockReturnValue('/tmp/bad.zip')
    vi.mocked(window.api.importZip).mockRejectedValue(new Error('corrupt archive'))

    const wrapper = mount(ImportDropzone)
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(wrapper.emitted('imported')).toBeUndefined()
  })
})
