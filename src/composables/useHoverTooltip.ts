import { computed, nextTick, ref, useSlots, useTemplateRef, watch, type Ref } from 'vue'
import { useGanttContext } from './useGanttContext'

/**
 * Hover state, visibility and edge-aware positioning for an opt-in bar/milestone
 * tooltip. Shared by `GanttTask` and `GanttMilestone` so the enable rule and the
 * clamp logic live in one place: the tooltip is on when the `tooltip` config flag
 * is set or a `tooltip` slot is provided, and is hidden while the item is dragged.
 *
 * `useSlots()` reads the calling component's slots, so each component sees its own
 * `tooltip` slot, and `useTemplateRef('tip')` binds to the component's
 * `ref="tip"` tooltip element so it can be measured and clamped to the content
 * bounds. `anchorLeft` is the item's x; `centered` matches the marker tooltip's
 * `translateX(-50%)` (the bar tooltip is left-anchored).
 */
export function useHoverTooltip(dragging: Ref<boolean>, anchorLeft: Ref<number>, centered: boolean) {
  const ctx = useGanttContext()
  const slots = useSlots()
  const hovered = ref(false)
  const show = computed(
    () => (ctx.config.value.tooltip || !!slots.tooltip) && hovered.value && !dragging.value,
  )

  // Measure the tooltip once shown so its left can be clamped within the content.
  const tip = useTemplateRef<HTMLElement>('tip')
  const tipWidth = ref(0)
  watch(show, async on => {
    if (!on) return
    await nextTick()
    tipWidth.value = tip.value?.offsetWidth ?? 0
  })
  const tipStyle = computed(() => ({
    left: `${clampFloatingLeft(anchorLeft.value, tipWidth.value, ctx.contentWidth.value, centered)}px`,
  }))

  return { hovered, show, tipStyle }
}

/**
 * Clamp a floating box's `left` so it stays within the content `[0, contentWidth]`.
 * Keeps the tooltip from being clipped at the chart's edges (esp. the last column).
 *
 * - `centered` (the marker tooltip uses `translateX(-50%)`): the box spans
 *   `[anchorLeft - width/2, anchorLeft + width/2]`, so clamp the centre into
 *   `[width/2, contentWidth - width/2]`.
 * - left-anchored (the bar tooltip): the box spans `[anchorLeft, anchorLeft + width]`,
 *   so clamp the left edge into `[0, contentWidth - width]`.
 *
 * When the box is wider than the content the lower bound wins, pinning the left
 * edge to 0. With no measurement yet (`width` 0) the anchor passes through.
 */
export function clampFloatingLeft(
  anchorLeft: number,
  width: number,
  contentWidth: number,
  centered: boolean,
): number {
  if (!width) return anchorLeft
  const min = centered ? width / 2 : 0
  const max = centered ? contentWidth - width / 2 : contentWidth - width
  return Math.max(min, Math.min(anchorLeft, max))
}
