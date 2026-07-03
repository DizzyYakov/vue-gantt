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
 * threaded into every `format` call, so `LLLL` etc. come out translated). This guide
 * covers date localization only — **RTL** layout mirroring is a separate concern and
 * not handled by `locale`.
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

/** Russian (`ru`): month names + weekday abbreviations render in Russian. */
export const Russian: Story = {
  args: { locale: ru },
}

/** German (`de`): the same chart with German date labels. */
export const German: Story = {
  args: { locale: de },
}

/**
 * `locale` composes with `labelFormat`: here a per-tier format (`LLLL yyyy` month,
 * ISO week, `d EEEEE` day) renders with Russian month and weekday names.
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
