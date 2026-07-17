import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

// reka-ui's DialogPortal teleports content to document.body a tick after
// mount, so every assertion here needs a flush before it can see it.

describe('ConfirmDialog', () => {
  it('renders the title and description when open', async () => {
    mount(ConfirmDialog, {
      props: { open: true, title: 'Delete collection?', description: 'This cannot be undone.' },
      attachTo: document.body
    })
    await flushPromises()
    expect(document.body.textContent).toContain('Delete collection?')
    expect(document.body.textContent).toContain('This cannot be undone.')
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { open: true, title: 'Delete?', confirmLabel: 'Yes, delete' },
      attachTo: document.body
    })
    await flushPromises()
    const confirmButton = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Yes, delete')
    )!
    confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emits update:open false when Cancel is clicked', async () => {
    const wrapper = mount(ConfirmDialog, { props: { open: true, title: 'Delete?' }, attachTo: document.body })
    await flushPromises()
    const cancelButton = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cancel')
    )!
    cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('disables the confirm button while loading', async () => {
    mount(ConfirmDialog, { props: { open: true, title: 'Delete?', loading: true }, attachTo: document.body })
    await flushPromises()
    const confirmButton = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm')
    )!
    expect(confirmButton.hasAttribute('disabled')).toBe(true)
  })
})
