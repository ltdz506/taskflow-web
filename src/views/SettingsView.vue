<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppNav from '@/components/AppNav.vue'
import { useConfigStore, parseConfigValue } from '@/stores/config'
import { useToast } from '@/composables/useToast'
import type { ConfigItem } from '@/types/models'

const PAGE_SIZE = 15

const config = useConfigStore()
const toast = useToast()

const page = ref(1)
const saving = ref(false)

/** 编辑中的值：id → 纯值字符串 */
const draft = reactive<Record<string, string>>({})
/** 服务端原值，用于判断是否有改动 */
const original = reactive<Record<string, string>>({})

const totalPages = computed(() => Math.max(1, Math.ceil(config.items.length / PAGE_SIZE)))

const paged = computed(() =>
  config.items.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

const rangeText = computed(() => {
  if (config.items.length === 0) return '0 / 0'
  const start = (page.value - 1) * PAGE_SIZE + 1
  const end = Math.min(page.value * PAGE_SIZE, config.items.length)
  return `${start}–${end} / ${config.items.length}`
})

const dirty = computed(() =>
  config.items.some((item) => draft[item.id] !== undefined && draft[item.id] !== original[item.id]),
)

/** value 里可能带单位，这里只取纯值 */
function parsed(item: ConfigItem): ReturnType<typeof parseConfigValue> {
  return parseConfigValue(item.value)
}

/** 数值型设置补上单位显示（超时=分钟，文件大小=MB，保留期限=天） */
function unitOf(item: ConfigItem): string {
  if (item.content.includes('超时')) return ' 分钟'
  if (item.content.includes('大小')) return ' MB'
  if (item.content.includes('保留')) return ' 天'
  return ''
}

function optionLabel(item: ConfigItem, option: string): string {
  const unit = unitOf(item)
  if (!unit || !/^\d+$/.test(option)) return option
  return `${option}${unit}`
}

function sync(): void {
  for (const item of config.items) {
    const value = parsed(item).value
    draft[item.id] = value
    original[item.id] = value
  }
}

function toggleSwitch(item: ConfigItem): void {
  draft[item.id] = draft[item.id] === '1' ? '0' : '1'
}

function isOn(item: ConfigItem): boolean {
  const value = draft[item.id] ?? '0'
  return value === '1' || value === 'true'
}

async function save(): Promise<void> {
  if (!dirty.value) return
  saving.value = true
  try {
    // 全量提交当前页展示的每一项（PRD UC-08）
    await config.save(paged.value.map((item) => ({ id: item.id, value: draft[item.id] ?? '' })))
    for (const item of paged.value) original[item.id] = draft[item.id] ?? ''
    toast.success('设置已保存')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await config.load(true)
  sync()
})
</script>

<template>
  <div class="page">
    <AppNav />

    <header class="page-head">
      <h1 class="page-title">设置</h1>
      <p class="page-desc">管理 Agent 行为、通知、安全与界面偏好</p>
    </header>

    <section class="panel">
      <header class="panel-head">
        <h2 class="panel-title">全局与个人设置</h2>
        <div class="head-right">
          <span class="sync">
            <i class="sync-dot" :class="{ warn: config.error }" aria-hidden="true" />
            {{ config.error ? '未能同步服务端' : '已从服务端同步' }}
          </span>
          <button type="button" class="save-btn" :disabled="!dirty || saving" @click="save">
            {{ saving ? '保存中…' : '保存设置' }}
          </button>
        </div>
      </header>

      <div class="divider" />

      <div class="rows">
        <p v-if="config.loading && config.items.length === 0" class="empty">正在加载设置…</p>
        <p v-else-if="config.items.length === 0" class="empty">服务端还没有可配置的设置项</p>

        <div
          v-for="(item, index) in paged"
          :key="item.id"
          class="row"
          :class="{ alt: index % 2 === 1 }"
        >
          <div class="row-text">
            <p class="row-name">{{ item.content }}</p>
            <p class="row-desc">{{ item.description }}</p>
          </div>

          <div class="row-control">
            <template v-if="parsed(item).type === 'SELECT'">
              <label class="select">
                <select v-model="draft[item.id]">
                  <option v-for="option in parsed(item).choose" :key="option" :value="option">
                    {{ optionLabel(item, option) }}
                  </option>
                </select>
                <span class="select-arrow" aria-hidden="true">▼</span>
              </label>
            </template>

            <template v-else-if="parsed(item).type === 'SWITCH'">
              <button
                type="button"
                class="switch"
                :class="{ on: isOn(item) }"
                :aria-pressed="isOn(item)"
                @click="toggleSwitch(item)"
              >
                <span class="knob" />
              </button>
            </template>

            <template v-else>
              <label class="text-field">
                <input v-model="draft[item.id]" type="text" inputmode="numeric" />
                <span v-if="unitOf(item)" class="text-unit">{{ unitOf(item).trim() }}</span>
              </label>
            </template>
          </div>
        </div>
      </div>

      <footer class="panel-foot">
        <span class="range">{{ rangeText }}</span>
        <span class="foot-note">每页最多显示 15 项</span>
        <div class="pager">
          <button
            type="button"
            class="pager-btn"
            :disabled="page <= 1"
            @click="page = Math.max(1, page - 1)"
          >
            ‹
          </button>
          <button
            type="button"
            class="pager-btn"
            :disabled="page >= totalPages"
            @click="page = Math.min(totalPages, page + 1)"
          >
            ›
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  min-height: 680px;
  display: flex;
  flex-direction: column;
  padding: 38px 72px 72px;
}

.page-head {
  margin-top: 20px;
  flex: none;
}

.page-title {
  font-size: 30px;
  font-weight: 700;
  line-height: 42px;
  letter-spacing: -0.5px;
  color: #f5f7fa;
}

.page-desc {
  margin-top: 2px;
  font-size: 13px;
  line-height: 20px;
  color: #7f8998;
}

.panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  padding: 18px 32px 20px;
  border-radius: 24px;
  background: rgba(16, 21, 28, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 38px;
  flex: none;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
  color: #eef2f7;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sync {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #83909f;
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6cdf9c;
}

.sync-dot.warn {
  background: #ff7c87;
}

.save-btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 11px;
  background: #f4f7fb;
  font-size: 12px;
  font-weight: 500;
  color: #0a0d12;
  transition: opacity 0.2s ease;
}

.save-btn:disabled {
  background: rgba(244, 247, 251, 0.14);
  color: #6b7688;
  cursor: not-allowed;
}

.divider {
  flex: none;
  height: 1px;
  margin-top: 14px;
  background: rgba(255, 255, 255, 0.07);
}

.rows {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 10px;
}

.empty {
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: #6b7688;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 58px;
  padding: 0 24px;
  border-radius: 12px;
}

.row.alt {
  background: rgba(255, 255, 255, 0.018);
}

.row + .row {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
}

.row-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #d8dee7;
}

.row-desc {
  margin-top: 1px;
  font-size: 10px;
  line-height: 18px;
  color: #677383;
}

.row-control {
  flex: none;
}

.select,
.text-field {
  position: relative;
  display: block;
  height: 38px;
  border-radius: 12px;
  background: rgba(8, 12, 17, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.select {
  width: 192px;
}

.select select {
  appearance: none;
  width: 100%;
  height: 100%;
  padding: 0 34px 0 16px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #b8c2cf;
  outline: none;
  cursor: pointer;
}

.select select option {
  background: #10151c;
  color: #dfe6ef;
}

.select-arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  color: #697585;
  pointer-events: none;
}

.text-field {
  width: 192px;
  display: flex;
  align-items: center;
}

.text-field input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 0 0 16px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #b8c2cf;
  outline: none;
}

.text-unit {
  flex: none;
  padding-right: 14px;
  font-size: 11px;
  color: #697585;
}

.switch {
  position: relative;
  width: 52px;
  height: 30px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  transition:
    background 0.22s ease,
    border-color 0.22s ease;
}

.switch.on {
  background: rgba(111, 168, 255, 0.28);
  border-color: rgba(135, 184, 255, 0.26);
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #788392;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1),
    background 0.22s ease;
}

.switch.on .knob {
  transform: translateX(22px);
  background: #f3f7fc;
}

.panel-foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin-top: 10px;
}

.range {
  font-size: 11px;
  color: #697483;
}

.foot-note {
  flex: 1;
  font-size: 10px;
  color: #505b69;
}

.pager {
  display: flex;
  gap: 12px;
}

.pager-btn {
  width: 44px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 18px;
  color: #aab4c2;
}

.pager-btn:disabled {
  background: rgba(255, 255, 255, 0.035);
  color: #566171;
  cursor: not-allowed;
}

@media (max-width: 1180px) {
  .page {
    padding: 32px 32px 40px;
  }
}
</style>
