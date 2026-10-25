<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const NAV_ITEMS = [
  { name: 'home', label: '首页', width: 104 },
  { name: 'tasks', label: 'AI 任务', width: 126 },
  { name: 'settings', label: '设置', width: 138 },
] as const

const activeIndex = computed(() => {
  const index = NAV_ITEMS.findIndex((item) => item.name === route.name)
  return index < 0 ? 0 : index
})

/** 滑块的位置 = 左内边距 + 前面所有项宽度；宽度跟随当前项 */
const pillStyle = computed(() => {
  const active = NAV_ITEMS[activeIndex.value]
  if (!active) return { left: '8px', width: '0px' }
  const left = NAV_ITEMS.slice(0, activeIndex.value).reduce((sum, item) => sum + item.width, 8)
  return { left: `${left}px`, width: `${active.width}px` }
})

const avatarLetter = computed(() => {
  const title = user.profile?.userTitle?.trim()
  if (title) return title.slice(0, 1).toUpperCase()
  return user.profile?.userName?.slice(0, 1) ?? 'T'
})

const userName = computed(() => user.profile?.userName ?? 'Taskflow')
</script>

<template>
  <header class="nav">
    <div class="nav-user">
      <span class="avatar">{{ avatarLetter }}</span>
      <span class="user-name">{{ userName }}</span>
      <span class="online-dot" aria-hidden="true" />
    </div>

    <nav class="nav-switch" aria-label="主导航">
      <span class="nav-pill" :style="pillStyle" aria-hidden="true" />
      <button
        v-for="item in NAV_ITEMS"
        :key="item.name"
        type="button"
        class="nav-item"
        :class="{ active: item.name === route.name }"
        :style="{ width: `${item.width}px` }"
        @click="router.push({ name: item.name })"
      >
        {{ item.label }}
      </button>
    </nav>
  </header>
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 18px;
  border-radius: 26px;
  background: rgba(17, 21, 27, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.035);
  flex: none;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(239, 244, 251, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-family: 'Inter', var(--font-sans), sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: #fff;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  color: #f2f5f9;
}

.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6ce5a5;
  margin-left: 2px;
}

.nav-switch {
  position: relative;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 6px 8px;
  border-radius: 17px;
  background: rgba(8, 11, 16, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-pill {
  position: absolute;
  top: 6px;
  height: 36px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.13);
  /* 先加速、后减速的 S 形曲线，接近 iOS 分段控件的滑动手感 */
  transition:
    left 0.48s cubic-bezier(0.65, 0, 0.35, 1),
    width 0.48s cubic-bezier(0.65, 0, 0.35, 1);
}

.nav-item {
  position: relative;
  z-index: 1;
  height: 36px;
  border-radius: 13px;
  font-size: 14px;
  font-weight: 400;
  color: #8f98a8;
  transition: color 0.2s ease;
}

.nav-item:hover {
  color: #c6cedb;
}

.nav-item.active {
  color: #fff;
  font-weight: 500;
}

@media (max-width: 1180px) {
  .user-name {
    display: none;
  }
}
</style>
