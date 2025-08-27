import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./RulesApp.vue";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
