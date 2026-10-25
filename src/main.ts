import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

/**
 * 等首次路由解析完成再挂载。
 * 否则首帧 route.name 还是空的，导航滑块会先落在「首页」，
 * 等懒加载路由匹配上再滑到当前页 —— 表现为刷新时滑块从首页滑过来一次。
 */
router
  .isReady()
  .catch(() => {
    // 首次导航失败也照常挂载，避免整页空白（用户仍可手动跳转）
  })
  .then(() => app.mount('#app'))
