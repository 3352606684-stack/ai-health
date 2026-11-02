import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './styles/base.css'

// Element Plus 由 vite.config.js 里的 unplugin 按需自动导入，
// 这里不需要 import ElementPlus 或注册样式文件。

createApp(App).use(router).mount('#app')
