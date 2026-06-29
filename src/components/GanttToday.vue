<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'

const props = withDefaults(
  defineProps<{
    /** How often the line re-positions, in ms. Default 1000 (second precision). */
    interval?: number
  }>(),
  { interval: 1000 },
)

const { dateToX, contentWidth } = useGanttContext()

// Live clock so the line tracks the current moment with second-level precision.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, props.interval)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const date = computed(() => new Date(now.value))
const x = computed(() => dateToX(now.value))
const visible = computed(() => x.value >= 0 && x.value <= contentWidth.value)
</script>

<template>
  <div v-if="visible" class="gantt-today" :style="{ left: `${x}px` }" aria-hidden="true">
    <slot :x="x" :date="date" />
  </div>
</template>

<style scoped>
.gantt-today {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: var(--gantt-today-border, 2px solid var(--gantt-today-color, #ef4444));
  pointer-events: none;
}
</style>
