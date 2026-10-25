<script setup lang="ts">
import { computed } from 'vue'
import { taskflowStatusMeta, taskStatusMeta, toneColor } from '@/utils/status'

const props = withDefaults(
  defineProps<{
    status?: string | null
    kind?: 'taskflow' | 'task'
    label?: string
    dot?: boolean
  }>(),
  { kind: 'taskflow', label: '', dot: false },
)

const meta = computed(() =>
  props.kind === 'task' ? taskStatusMeta(props.status) : taskflowStatusMeta(props.status),
)

const text = computed(() => props.label || meta.value.label)
const color = computed(() => toneColor(meta.value.tone))
</script>

<template>
  <span class="status-tag" :style="{ color, background: `${color}24`, borderColor: `${color}3d` }">
    <span v-if="dot" class="status-dot" :style="{ background: color }" aria-hidden="true" />
    {{ text }}
  </span>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 26px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 13px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>
