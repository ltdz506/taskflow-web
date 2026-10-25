<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTaskflowStore } from '@/stores/taskflow'
import { toneColor, taskflowStatusMeta } from '@/utils/status'
import { formatListDate } from '@/utils/format'
import StatusTag from '@/components/StatusTag.vue'
import type { TaskflowSummary } from '@/types/models'

const store = useTaskflowStore()
const search = ref(store.keyword)
let timer: number | undefined

/** 每页 5 条，序号按全量递增，翻页后接着往下数 */
const FIRST_INDEX = computed(() => (store.page - 1) * 5)

const rangeText = computed(() => {
  if (store.total === 0) return '0 / 0'
  const start = (store.page - 1) * 5 + 1
  const end = Math.min(store.page * 5, store.total)
  return `${start}–${end} / ${store.total}`
})

const canPrev = computed(() => store.page > 1 && !store.listLoading)
const canNext = computed(() => store.page < store.totalPages && !store.listLoading)

function dotStyle(item: TaskflowSummary): Record<string, string> {
  const color = toneColor(taskflowStatusMeta(item.status).tone)
  return { color, background: `${color}29` }
}

function onSearchInput(): void {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    store.keyword = search.value
    void store.loadList(1)
  }, 350)
}

function changePage(delta: number): void {
  void store.loadList(store.page + delta)
}

watch(
  () => store.keyword,
  (value) => {
    if (value !== search.value) search.value = value
  },
)

onMounted(() => {
  void store.loadList(1)
})

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <section class="list-panel">
    <header class="list-head">
      <h2 class="list-title">任务流</h2>
      <span class="count-chip">{{ store.total }} 条记录</span>
    </header>

    <label class="search">
      <span class="search-dot" aria-hidden="true" />
      <input
        v-model="search"
        type="text"
        placeholder="搜索任务流"
        aria-label="搜索任务流"
        @input="onSearchInput"
      />
    </label>

    <div class="list-scroll">
      <p v-if="store.listError" class="list-tip error">
        {{ store.listError }}
        <button type="button" class="retry" @click="store.loadList(store.page)">重试</button>
      </p>

      <p v-else-if="store.listLoading && store.items.length === 0" class="list-tip">正在加载…</p>

      <p v-else-if="store.items.length === 0" class="list-tip">
        {{ store.keyword ? '没有匹配的任务流' : '还没有任务流，点击右上角新建' }}
      </p>

      <ul v-else class="rows">
        <li v-for="(item, index) in store.items" :key="item.id">
          <button
            type="button"
            class="row"
            :class="{ selected: item.id === store.selectedId }"
            @click="store.select(item.id)"
          >
            <span class="row-index" :style="dotStyle(item)">
              {{ FIRST_INDEX + index + 1 }}
            </span>
            <span class="row-main">
              <span class="row-title">{{ item.title }}</span>
              <span class="row-meta">{{ formatListDate(item.createTime) }}</span>
            </span>
            <StatusTag :status="item.status" class="row-status" />
          </button>
        </li>
      </ul>
    </div>

    <footer class="list-foot">
      <span class="range">{{ rangeText }}</span>
      <div class="pager">
        <button type="button" class="pager-btn" :disabled="!canPrev" @click="changePage(-1)">‹</button>
        <button type="button" class="pager-btn" :disabled="!canNext" @click="changePage(1)">›</button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.list-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 18px 24px 20px;
  border-radius: 24px;
  background: rgba(16, 21, 28, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  flex: none;
}

.list-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
  color: #eef2f7;
}

.count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 12px;
  border-radius: 13px;
  background: rgba(142, 162, 189, 0.14);
  border: 1px solid rgba(142, 162, 189, 0.24);
  font-size: 11px;
  font-weight: 500;
  color: #9da8b8;
  white-space: nowrap;
}

.search {
  position: relative;
  display: block;
  height: 42px;
  margin-top: 12px;
  flex: none;
}

.search-dot {
  position: absolute;
  left: 16px;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-top: -4px;
  border-radius: 50%;
  background: #657286;
  pointer-events: none;
}

.search input {
  width: 100%;
  height: 42px;
  padding: 0 16px 0 34px;
  border-radius: 13px;
  background: rgba(8, 12, 17, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 12px;
  color: #e6ecf4;
  outline: none;
  transition: border-color 0.2s ease;
}

.search input::placeholder {
  color: #626d7c;
}

.search input:focus {
  border-color: rgba(140, 184, 255, 0.32);
}

.list-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 10px;
  overflow-y: auto;
  padding-right: 2px;
}

.list-tip {
  padding: 28px 8px;
  font-size: 12px;
  line-height: 20px;
  color: #6b7688;
  text-align: center;
}

.list-tip.error {
  color: #ff9aa3;
}

.retry {
  display: block;
  margin: 8px auto 0;
  font-size: 12px;
  color: #8fbcf7;
  text-decoration: underline;
}

.rows {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 74px;
  padding: 0 18px 0 16px;
  border-radius: 18px;
  border: 1px solid transparent;
  text-align: left;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.row.selected {
  background: rgba(255, 255, 255, 0.075);
  border-color: rgba(140, 184, 255, 0.14);
}

.row-index {
  flex: none;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 76px;
}

.row-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #c8ced7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row.selected .row-title {
  color: #f1f4f8;
}

.row-meta {
  font-size: 11px;
  line-height: 18px;
  color: #687382;
}

.row-status {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
}

.list-foot {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
}

.range {
  font-size: 11px;
  color: #697483;
}

.pager {
  display: flex;
  gap: 8px;
}

.pager-btn {
  width: 44px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 18px;
  line-height: 22px;
  color: #aab4c2;
  transition: background 0.2s ease;
}

.pager-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}

.pager-btn:disabled {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(255, 255, 255, 0.06);
  color: #566171;
  cursor: not-allowed;
}
</style>
