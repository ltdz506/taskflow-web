<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

interface SelectOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    width?: number
  }>(),
  { width: 192 },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})
const activeIndex = ref(0)

const currentLabel = computed(
  () => props.options.find((option) => option.value === props.modelValue)?.label ?? '请选择',
)

/** 面板用 fixed 定位并挂在 body 上，避免被设置面板的滚动容器裁掉 */
function measure(): void {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const panelHeight = props.options.length * 38 + 12
  const spaceBelow = window.innerHeight - rect.bottom
  const flip = spaceBelow < panelHeight + 12 && rect.top > panelHeight + 12
  panelStyle.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    top: flip ? `${rect.top - panelHeight - 8}px` : `${rect.bottom + 8}px`,
  }
}

function openPanel(): void {
  if (open.value) return
  open.value = true
  const index = props.options.findIndex((option) => option.value === props.modelValue)
  activeIndex.value = Math.max(0, index)
  measure()
  void nextTick(() => panelRef.value?.focus())
  document.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
}

function close(): void {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target as Node
  if (triggerRef.value?.contains(target) || panelRef.value?.contains(target)) return
  close()
}

function choose(value: string): void {
  emit('update:modelValue', value)
  close()
  triggerRef.value?.focus()
}

function onTriggerKey(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    openPanel()
  }
}

function onPanelKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    triggerRef.value?.focus()
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const delta = event.key === 'ArrowDown' ? 1 : -1
    const count = props.options.length
    activeIndex.value = (activeIndex.value + delta + count) % count
    void nextTick(() => panelRef.value?.querySelector<HTMLElement>('.is-active')?.scrollIntoView({ block: 'nearest' }))
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    onPanelEnter()
    return
  }
  if (event.key === 'Tab') close()
}

function onPanelEnter(): void {
  const option = props.options[activeIndex.value]
  if (option) choose(option.value)
}

onBeforeUnmount(close)
</script>

<template>
  <div class="app-select" :style="{ width: `${width}px` }">
    <button
      ref="triggerRef"
      type="button"
      class="select-trigger"
      :class="{ open }"
      role="combobox"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open ? close() : openPanel()"
      @keydown="onTriggerKey"
    >
      <span class="trigger-text">{{ currentLabel }}</span>
      <svg class="chevron" viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
        <path d="M3 4.5 6 7.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="select-pop">
        <div
          v-if="open"
          ref="panelRef"
          class="select-panel"
          :style="panelStyle"
          role="listbox"
          tabindex="-1"
          @keydown="onPanelKey"
        >
          <button
            v-for="(option, index) in options"
            :key="option.value"
            type="button"
            class="select-option"
            :class="{
              'is-selected': option.value === modelValue,
              'is-active': index === activeIndex,
            }"
            role="option"
            :aria-selected="option.value === modelValue"
            @mouseenter="activeIndex = index"
            @click="choose(option.value)"
          >
            <span>{{ option.label }}</span>
            <svg
              v-if="option.value === modelValue"
              class="check"
              viewBox="0 0 12 12"
              width="12"
              height="12"
              fill="none"
              aria-hidden="true"
            >
              <path d="M2.5 6.2 4.9 8.6 9.5 3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  background: rgba(8, 12, 17, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 14.4px;
  font-weight: 500;
  color: #b8c2cf;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.select-trigger:hover {
  border-color: rgba(140, 184, 255, 0.24);
}

.select-trigger.open {
  border-color: rgba(140, 184, 255, 0.42);
  background: rgba(12, 18, 26, 0.88);
}

.select-trigger:focus-visible {
  outline: none;
  border-color: rgba(140, 184, 255, 0.52);
  box-shadow: 0 0 0 3px rgba(105, 167, 255, 0.12);
}

.trigger-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex: none;
  color: #697585;
  transition: transform 0.24s cubic-bezier(0.65, 0, 0.35, 1);
}

.select-trigger.open .chevron {
  transform: rotate(180deg);
  color: #8fbcf7;
}

.select-panel {
  position: fixed;
  z-index: 100;
  padding: 6px;
  border-radius: 14px;
  background: rgba(17, 23, 32, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  outline: none;
  max-height: 320px;
  overflow-y: auto;
}

.select-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 14.4px;
  font-weight: 500;
  color: #b9c3d1;
  text-align: left;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

/* 选项之间隐约的分隔线，左右内缩 */
.select-option + .select-option::before {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  top: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.045);
}

.select-option.is-active {
  background: rgba(255, 255, 255, 0.06);
  color: #eaf0f8;
}

.select-option.is-selected {
  color: #fff;
}

.check {
  flex: none;
  color: #8fbcf7;
}

.select-pop-enter-active,
.select-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1);
  transform-origin: top center;
}

.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
