<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const user = useUserStore()

/** 接口没有返回内容时的兜底句子（PRD UC-02 扩展 3a） */
const FALLBACK_TEXT = '保持好奇，答案往往在下一次尝试之后。'

const headline = computed(() => user.profile?.userIndexTxt?.trim() || FALLBACK_TEXT)

const capsule = computed(() => {
  if (user.profile) return { text: '首页内容已更新', color: '#67d99d' }
  if (user.profileFailed) return { text: '暂时无法获取首页内容', color: '#ff7c87' }
  return { text: '正在获取首页内容', color: '#6fa8ff' }
})

onMounted(() => {
  void user.loadProfile()
})
</script>

<template>
  <div class="home">
    <main class="home-main">
      <div class="quote-block">
        <p class="quote-tag">
          <span class="tag-dot" aria-hidden="true" />
          每日一句
        </p>

        <span class="quote-mark" aria-hidden="true">“</span>
        <h1 class="headline">{{ headline }}</h1>

        <p class="hint">页面打开时自动从接口获取并展示</p>

        <div class="status-capsule">
          <span class="capsule-dot" :style="{ background: capsule.color }" aria-hidden="true" />
          {{ capsule.text }}
        </div>
      </div>
    </main>

    <footer class="home-footer">
      <span>Taskflow</span>
      <span>今天 · 安全连接</span>
    </footer>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 72px 72px;
}

.home-main {
  flex: 1;
  display: grid;
  place-items: center;
}

.quote-block {
  position: relative;
  width: min(1000px, 100%);
  text-align: center;
}

.quote-tag {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 38px;
  padding: 0 22px;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.065);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1px;
  color: #aeb8c7;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #76acff;
}

.quote-mark {
  position: absolute;
  left: -12px;
  top: 22px;
  font-family: 'Source Han Sans CN', var(--font-sans), sans-serif;
  font-size: 108px;
  line-height: 120px;
  font-weight: 700;
  letter-spacing: -6px;
  color: #fff;
  opacity: 0.055;
  pointer-events: none;
  user-select: none;
}

.headline {
  position: relative;
  margin-top: 34px;
  font-size: 54px;
  line-height: 76px;
  font-weight: 700;
  letter-spacing: -1.2px;
  color: #f5f7fa;
  white-space: pre-line;
}

.hint {
  margin-top: 16px;
  font-size: 14px;
  color: #778291;
}

.status-capsule {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  margin-top: 44px;
  padding: 0 22px;
  border-radius: 16px;
  background: rgba(15, 20, 27, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  color: #aab4c3;
}

.capsule-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.home-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  letter-spacing: 0.2px;
  color: #5f6978;
}

@media (max-width: 1180px) {
  .home {
    padding: 0 32px 40px;
  }

  .headline {
    font-size: 42px;
    line-height: 60px;
  }
}
</style>
