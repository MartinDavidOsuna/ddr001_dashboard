import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import router from './router'
import './assets/main.css'

createApp(App).use(createPinia()).use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } }).use(router).mount('#app')

