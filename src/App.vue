<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import ToastHost from '@/components/ToastHost.vue'
import { useUserStore } from '@/stores/user'
import { useTaskflowStore } from '@/stores/taskflow'

const route = useRoute()
const user = useUserStore()
const taskflow = useTaskflowStore()

/** 登录页不带主导航 */
const showNav = computed(() => !route.meta.public)

/** 有 token 就连实时通道并拉一次用户信息；退出时断开 */
watch(
  () => user.token,
  (token) => {
    if (token) {
      void user.loadProfile()
      taskflow.connectRealtime(token)
    } else {
      taskflow.disconnectRealtime()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-shell">
    <div v-if="showNav" class="app-nav">
      <AppNav />
    </div>

    <div class="app-body">
      <RouterView />
    </div>
  </div>

  <ToastHost />
</template>

<style>
/* 导航常驻在外层：路由切换时导航实例不销毁，滑块才有可过渡的起点 */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-nav {
  flex: none;
  padding: 38px 72px 0;
}

.app-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1180px) {
  .app-nav {
    padding: 32px 32px 0;
  }
}
</style>
