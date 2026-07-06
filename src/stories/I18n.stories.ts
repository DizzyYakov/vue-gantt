import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { de, ru } from 'date-fns/locale'
import Gantt from '../components/Gantt.vue'
import { sampleRows } from './_shared'

/**
 * # Localization (i18n)
 *
 * Every date label the chart renders — the multi-tier column headers, the live drag
 * label and the tooltips — goes through date-fns `format`. Pass a date-fns
 * [`Locale`](https://date-fns.org/docs/Locale) as the `locale` prop and all of them
 * localize at once.
 *
 * Locales are **not bundled** — import only the ones you use from `date-fns/locale`
 * and pass the object:
 *
 * ```ts
 * import { ru } from 'date-fns/locale'
 * // <Gantt :rows="rows" :locale="ru" />
 * ```
 *
 * Combine it with `labelFormat` for locale-aware custom formats (the locale is
 * threaded into every `format` call, so `LLLL` etc. come out translated). The default
 * week label's prefix (the `w` week-number token) is also localized from `locale`'s
 * language automatically — `en`→`W`, `ru`→`Н`, `de`→`KW`, `fr`→`S`, any other language
 * falls back to `W`. The week tier's own start day comes from `locale` too (override
 * either with `weekStartsOn`). This guide covers date localization only — **RTL**
 * layout mirroring is a separate concern and not handled by `locale`.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Localization',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows: sampleRows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 40,
    height: 300,
    tooltip: true,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/**
 * Russian (`ru`): month names + weekday abbreviations render in Russian, and the
 * week tier's default label prefix auto-localizes to `Н` (e.g. `Н23`).
 */
export const Russian: Story = {
  args: { locale: ru },
}

/**
 * German (`de`): the same chart with German date labels; the week tier's default
 * label prefix auto-localizes to `KW` (e.g. `KW23`).
 */
export const German: Story = {
  args: { locale: de },
}

/**
 * `locale` composes with `labelFormat`: here a per-tier format (`LLLL yyyy` month,
 * ISO week, `d EEEEE` day) renders with Russian month and weekday names. The
 * explicit `week: "'W'w"` format overrides the auto-localized `Н` prefix — pass
 * your own literal prefix (e.g. `"'нед 'w"`) when the auto default isn't wanted.
 */
export const WithLabelFormat: Story = {
  args: {
    locale: ru,
    labelFormat: {
      month: 'LLLL yyyy',
      week: "'W'w",
      day: 'd EEEEE',
    },
    columnWidth: 46,
  },
}

/**
 * `weekStartsOn` overrides the week's first day independently of `locale` (0=Sunday
 * … 6=Saturday). Here Russian labels are paired with a Monday week start (the ISO
 * convention `ru` already defaults to) made explicit, so the week-tier boundaries
 * and the `w` number both align to Monday.
 */
export const WeekStartsOnMonday: Story = {
  args: {
    locale: ru,
    weekStartsOn: 1,
    columnWidth: 46,
  },
}
