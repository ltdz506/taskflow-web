<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  const key = password.value.trim()
  if (!key) {
    error.value = '请输入访问密钥'
    return
  }

  loading.value = true
  error.value = ''
  try {
    await userStore.login(key)
    await router.replace({ name: 'home' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '验证失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <header class="login-header">
      <div class="brand">
        <span class="brand-mark">T</span>
        <span class="brand-name">Taskflow</span>
      </div>
      <span class="header-note">安全访问 · Token 登录</span>
    </header>

    <main class="login-panel">
      <div class="key-badge">
        <svg viewBox="0 0 80 80" width="46" height="46" fill="none" aria-hidden="true">
          <circle cx="31" cy="33" r="10" stroke="#d7e8ff" stroke-width="4" />
          <rect x="41" y="31" width="22" height="5" rx="2.5" fill="#d7e8ff" />
          <rect x="48" y="32" width="5" height="8" rx="2.5" fill="#d7e8ff" />
          <rect x="55" y="32" width="5" height="11" rx="2.5" fill="#d7e8ff" />
        </svg>
      </div>

      <h1 class="title">欢迎回来</h1>
      <p class="subtitle">输入访问密钥以继续进入任务空间</p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="field-label" for="access-key">访问密钥</label>
        <div class="field">
          <span class="field-dot" aria-hidden="true"></span>
          <input
            id="access-key"
            v-model="password"
            type="password"
            placeholder="输入访问密钥"
            autocomplete="current-password"
            autofocus
          />
        </div>

        <button class="submit-btn" type="submit" :disabled="loading">
          <span class="btn-label">{{ loading ? '验证中…' : '验证并进入' }}</span>
          <span class="btn-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
              <path d="M5 12h13" stroke="#fff" stroke-width="2" stroke-linecap="round" />
              <path
                d="M12 6l6 6-6 6"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>
      </form>

      <p class="caption" :class="{ 'is-error': error !== '' }">
        {{ error || '密钥验证成功后将安全保存访问令牌' }}
      </p>
    </main>

    <footer class="login-footer">安全连接 · 访问受到保护</footer>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 140px 24px 120px;
}

/* ---------- 顶部：品牌 + 安全说明 ---------- */
.login-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 48px 72px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  font-family: 'Inter', var(--font-sans);
  font-size: 18px;
  font-weight: 500;
  color: #fff;
}

.brand-name {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: #f5f7fa;
}

.header-note {
  font-size: 13px;
  letter-spacing: 0.2px;
  color: #8f98a8;
}

/* ---------- 中央登录面板 ---------- */
.login-panel {
  position: relative;
  width: min(480px, 100%);
  padding: 46px 48px 44px;
  border-radius: var(--radius-lg);
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  box-shadow:
    0 28px 80px rgba(0, 0, 0, 0.44),
    inset 0 1px 0 rgba(255, 255, 255, 0.035);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 面板顶部柔光 */
.login-panel::before {
  content: '';
  position: absolute;
  top: -34px;
  left: 50%;
  width: 220px;
  height: 80px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(94, 162, 255, 0.16), transparent);
  pointer-events: none;
}

.key-badge {
  width: 80px;
  height: 80px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  background: rgba(238, 245, 255, 0.08);
  border: 1px solid rgba(156, 197, 255, 0.16);
}

.title {
  margin-top: 22px;
  font-size: 38px;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1.35;
  color: var(--text-1);
}

.subtitle {
  margin-top: 6px;
  font-size: 15px;
  color: var(--text-2);
}

/* ---------- 表单 ---------- */
.login-form {
  width: 100%;
  margin-top: 30px;
}

.field-label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #c9d1dc;
}

.field {
  position: relative;
}

.field-dot {
  position: absolute;
  left: 22px;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-top: -4px;
  border-radius: 50%;
  background: var(--accent-dot);
  pointer-events: none;
}

.field input {
  width: 100%;
  height: 58px;
  padding: 0 18px 0 42px;
  border-radius: var(--radius-md);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35);
  font-size: 15px;
  color: var(--text-1);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.field input::placeholder {
  color: var(--input-placeholder);
}

.field input:focus {
  border-color: rgba(175, 203, 255, 0.45);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.35),
    0 0 0 3px rgba(105, 167, 255, 0.12);
}

/* ---------- 主按钮 ---------- */
.submit-btn {
  position: relative;
  width: 100%;
  height: 58px;
  margin-top: 20px;
  border-radius: 17px;
  background: var(--btn-bg);
  color: var(--btn-text);
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 28px rgba(106, 169, 255, 0.16);
  transition:
    filter 0.2s ease,
    transform 0.12s ease;
}

.btn-label {
  padding-right: 30px;
}

.btn-arrow {
  position: absolute;
  right: 20px;
  top: 50%;
  width: 34px;
  height: 34px;
  margin-top: -17px;
  border-radius: 11px;
  background: var(--btn-icon-bg);
  display: grid;
  place-items: center;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.04);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ---------- 底部说明 / 错误提示 ---------- */
.caption {
  margin-top: 18px;
  font-size: 12px;
  color: var(--text-3);
  text-align: center;
}

.caption.is-error {
  color: var(--c-danger);
}

/* ---------- 页脚 ---------- */
.login-footer {
  position: absolute;
  bottom: 64px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: var(--text-4);
}

/* ---------- 入场动画 ---------- */
@media (prefers-reduced-motion: no-preference) {
  .login-panel {
    animation: panel-in 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }

  @keyframes panel-in {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
}
</style>
