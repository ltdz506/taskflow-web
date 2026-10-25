<script setup lang="ts">
import { ref } from 'vue'
import AppNav from '@/components/AppNav.vue'
import TaskflowList from './taskflow/TaskflowList.vue'
import TaskflowDetail from './taskflow/TaskflowDetail.vue'
import CreateTaskflowModal from './taskflow/CreateTaskflowModal.vue'
import { useTaskflowStore } from '@/stores/taskflow'

const store = useTaskflowStore()
const showCreate = ref(false)

/** 创建成功后回到第一页，并选中新建的那条 */
async function onCreated(taskflowId: string): Promise<void> {
  store.keyword = ''
  await store.loadList(1)
  await store.select(taskflowId)
}
</script>

<template>
  <div class="page">
    <AppNav />

    <header class="page-head">
      <div class="head-text">
        <h1 class="page-title">AI 任务</h1>
        <p class="page-desc">查看任务流进度、执行记录与最终产物</p>
      </div>
      <button type="button" class="new-btn" @click="showCreate = true">
        <span class="new-plus" aria-hidden="true">＋</span>
        新建任务流
      </button>
    </header>

    <div class="workbench">
      <TaskflowList />
      <TaskflowDetail />
    </div>

    <CreateTaskflowModal v-model="showCreate" @created="onCreated" />
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
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

.new-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 22px;
  border-radius: 16px;
  background: #f4f7fb;
  font-size: 14px;
  font-weight: 500;
  color: #0a0d12;
  box-shadow: 0 10px 24px rgba(106, 169, 255, 0.14);
  transition:
    filter 0.2s ease,
    transform 0.12s ease;
}

.new-btn:hover {
  filter: brightness(1.04);
}

.new-btn:active {
  transform: translateY(1px);
}

.new-plus {
  font-size: 19px;
  line-height: 1;
}

.workbench {
  flex: 1;
  min-height: 0;
  margin-top: 20px;
  display: grid;
  grid-template-columns: 356px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 24px;
}

@media (max-width: 1180px) {
  .page {
    padding: 32px 32px 40px;
  }

  .workbench {
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 18px;
  }
}

@media (max-width: 900px) {
  .workbench {
    grid-template-columns: 1fr;
    grid-template-rows: 420px minmax(0, 1fr);
  }
}
</style>
