<!-- src/components/Popup.vue -->
<template>
  <div class="popup-container">
    <a-layout>
    <a-layout-header class="header">
      <h2>🎥 Screen Activity Tracker</h2>
    </a-layout-header>

    <a-layout-content class="content">
      <div class="recorder-card">
        <a-button
          type="primary"
          size="large"
          @click="startScreenRecording"
          v-if="!isRecording"
        ><template #icon>
        <PlayCircleOutlined />
      </template>
          Start Tracking
        </a-button>

        <div v-else class="recording-indicator">
          <span class="dot"></span> Recording in progress...
          <a-button type="danger" size="large" @click="stopSharing" style="margin-left: 20px;">
            <template #icon>
          <PauseCircleOutlined />
        </template>
            Stop Recording
          </a-button>
        </div>
      </div>
    </a-layout-content>
  </a-layout>
  </div>
</template>

<script>
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons-vue';

export default {
  components: {
    PlayCircleOutlined,
    PauseCircleOutlined,
  },
  data() {
  return {
    isRecording: false,
  };
},
  methods: {
    startScreenRecording() {
  chrome.tabs.query({ active: true }, (tabs) => {
    const tab = tabs[0];
    if (tab) {
      chrome.runtime.sendMessage({
        action: "startRecording",
        tabId: tab.id,
      }, () => {
        this.isRecording = true;
      });
    }
  });
},
stopSharing() {
  chrome.runtime.sendMessage({ action: "stopRecording" }, () => {
    this.isRecording = false;
  });
}
  }
}
</script>

<style>
.popup-container {
  width: 360px;
  height: 240px;
  background-color: #f0f2f5;
  padding: 10px;
  box-sizing: border-box;
}
.header {
  background-color: #fff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  padding-left: 20px;
  display: flex;
  align-items: center;
}
.content {
  padding: 24px;
  background-color: #f9f9f9;
  min-height: 100vh;
}
.recorder-card {
  background-color: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
  text-align: center;
}
.recording-indicator {
  font-weight: 500;
  font-size: 16px;
  color: #f5222d;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dot {
  height: 10px;
  width: 10px;
  background-color: red;
  border-radius: 50%;
  display: inline-block;
  margin-right: 10px;
  animation: blink 1s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

</style>
