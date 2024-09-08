import './assets/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { initRouter } from './router';
import { initAxios } from './utils/axios';

function main() {
  const app = createApp(App);
  const router = initRouter();
  const axios = initAxios();
  (window as any).axios = axios;

  app.config.globalProperties.$axios = axios;
  app.use(createPinia())
  app.use(router)
  
  app.mount('#app')
}

main();
