<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import ToastHost from '@/components/ToastHost.vue'
import { useUserStore } from '@/stores/user'
import { useTaskflowStore } from '@/stores/taskflow'

const user = useUserStore()
const taskflow = useTaskflowStore()

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
  <RouterView />
  <ToastHost />
</template>
