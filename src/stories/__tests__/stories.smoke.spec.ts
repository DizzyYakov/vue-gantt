import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

// Eagerly import every story module so each story is exercised.
const modules = import.meta.glob('../*.stories.ts', { eager: true }) as Record<
  string,
  { default: Record<string, unknown>; [name: string]: unknown }
>

type AnyStory = {
  args?: Record<string, unknown>
  render?: (args: unknown, ctx: unknown) => unknown
}
type AnyMeta = {
  component?: unknown
  args?: Record<string, unknown>
  argTypes?: Record<string, unknown>
  render?: (args: unknown, ctx: unknown) => unknown
}

/**
 * Smoke test: mounting every story must not throw. This guards against the
 * class of bug where a story's `render`/`setup` crashes (e.g. a bad binding).
 */
describe('stories render without throwing', () => {
  for (const [path, mod] of Object.entries(modules)) {
    const meta = mod.default as AnyMeta
    const file = path.split('/').pop()

    for (const [name, value] of Object.entries(mod)) {
      if (name === 'default') continue
      const story = value as AnyStory
      // Only treat CSF story objects (have args/render) as stories.
      if (typeof story !== 'object' || story === null) continue

      it(`${file} › ${name}`, () => {
        const args = { ...meta.args, ...story.args }
        const ctx = { argTypes: meta.argTypes ?? {} }
        const render = story.render ?? meta.render

        const component = render
          ? (render(args, ctx) as Record<string, unknown>)
          : {
              components: { Subject: meta.component },
              setup: () => ({ args }),
              template: '<Subject v-bind="args" />',
            }

        const wrapper = mount(component as never)
        expect(wrapper.html()).toBeTruthy()
        wrapper.unmount()
      })
    }
  }
})
