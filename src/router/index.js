import { createRouter, createWebHashHistory } from "vue-router";
import Popup from "@/components/Popup.vue";
import ScreenRecorder from "@/components/ScreenRecorder.vue";
import Summary from "@/components/Summary.vue";

const routes = [
  { path: "/", component: Popup },
  { path: "/recorder",name: "recorder", component: ScreenRecorder },
  { path: "/summary",name:"summary",component: Summary}
];

const router = createRouter({
  history: createWebHashHistory(), // ✅ Use Hash History (Good for Extensions)
  routes,
});

export default router;
