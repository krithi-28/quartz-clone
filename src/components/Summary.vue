<template>
  <a-layout>
    <a-layout-header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 class="header-title">Recording Summary</h2>
        <a-button type="primary" :loading="isDownloading" @click="downloadZip">
          {{ isDownloading ? 'Preparing...' : 'Download' }}
        </a-button>

      </div>
    </a-layout-header>

    <a-layout-content class="summary-content">
      <div class="summary-grid">
        <!-- Left panel: Recorded Video -->
        <div class="summary-video-card">
          <h3 class="section-title">Screen Recording</h3>
          <video
            v-if="recordedVideo"
            :src="recordedVideo"
            controls
            class="summary-video"
          ></video>
          <div v-else class="no-video">No recording available</div>
        </div>

        <!-- Right panel: Logs -->
        <div class="summary-logs-card">
          <h3 class="section-title">Captured Logs</h3>
          <a-tabs default-active-key="1">
            <a-tab-pane key="1" tab="Console Logs">
              <pre class="log-box">{{ formatLogs(logs.consoleLogs) }}</pre>
            </a-tab-pane>
            <a-tab-pane key="2" tab="Network Logs">
              <pre class="log-box">{{ formatLogs(logs.networkLogs) }}</pre>
            </a-tab-pane>
            <a-tab-pane key="3" tab="System Info">
              <pre class="log-box">{{ formatLogs(logs.systemInfo) }}</pre>
            </a-tab-pane>
            <a-tab-pane key="4" tab="IP Address">
              <pre class="log-box">{{ logs.ipAddress }}</pre>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<script>
import { message } from "ant-design-vue";
import JSZip from "jszip";
import { saveAs } from "file-saver";
export default {

  data() {
    return {
      recordedVideo: null,
      logs: {
        consoleLogs: [],
        networkLogs: [],
        systemInfo: {},
        ipAddress: "",
        isDownloading: false,

      },
    };
  },
  mounted() {
    chrome.storage.local.get(["recordedVideo"], (result) => {
      this.recordedVideo = result.recordedVideo || null;
    });


    chrome.storage.local.get(
      ["logs", "networkLogs", "systemInfo", "ipAddress"],
      (data) => {
        this.logs.consoleLogs = data.logs || [];
        this.logs.networkLogs = data.networkLogs || [];
        this.logs.systemInfo = data.systemInfo || {};
        this.logs.ipAddress = data.ipAddress || "Not Available";
      }
    );
  },
  methods: {
    formatLogs(data) {
      return typeof data === "string"
        ? data
        : JSON.stringify(data, null, 2);
    },
    async downloadZip() {
  this.isDownloading = true;
  const zip = new JSZip();

  // Generate timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const readableTime = now.toLocaleString();

  // Add readable time to a timestamp file
  // zip.file("Timestamp.txt", `Date/Time: ${readableTime}`);

  // Add separate log files
  zip.file("Console_Logs.txt", this.formatLogs(this.logs.consoleLogs));
  zip.file("Network_Logs.txt", this.formatLogs(this.logs.networkLogs));
  zip.file("System_Info.txt", this.formatLogs(this.logs.systemInfo));
  zip.file("IPAddress.txt", this.logs.ipAddress || "Not Available");

  // Add video
  if (this.recordedVideo) {
    try {
      const response = await fetch(this.recordedVideo);
      const blob = await response.blob();
      zip.file("Screen_Recording.mp4", blob);
    } catch (error) {
      console.error("Error fetching video:", error);
      message.error("Failed to include video in the ZIP file.");
    }
  }

  // Create and save ZIP
  zip.generateAsync({ type: "blob" }).then((content) => {
    const zipFileName = `Activity_Capture_${timestamp}.zip`;
    saveAs(content, zipFileName);

    message.success("Download complete!");
    this.isDownloading = false;
  }).catch((err) => {
    message.error("Download failed!");
    this.isDownloading = false;
    console.error(err);
  });
}

    // async downloadZip() {
    //   this.isDownloading = true;
    //   const zip = new JSZip();

    //   // Generate timestamp
    //   const now = new Date();
    //   const timestamp = now.toISOString().replace(/[:.]/g, "-");
    //   const readableTime = now.toLocaleString();

    //   // Add logs as text
    //   const logsText = `
    // ===== Date/Time =====
    // ${readableTime}

    // ===== Console Logs =====
    // ${this.formatLogs(this.logs.consoleLogs)}

    // ===== Network Logs =====
    // ${this.formatLogs(this.logs.networkLogs)}

    // ===== System Info =====
    // ${this.formatLogs(this.logs.systemInfo)}

    // ===== IP Address =====
    // ${this.logs.ipAddress}
    //   `.trim();

    //   zip.file("Captured_Logs.txt", logsText);

    //   // Add video
    //   if (this.recordedVideo) {
    //     try {
    //       const response = await fetch(this.recordedVideo);
    //       const blob = await response.blob();
    //       zip.file("Screen_Recording.mp4", blob);
    //     } catch (error) {
    //       console.error("Error fetching video:", error);
    //       message.error("Failed to include video in the ZIP file.");
    //     }
    //   }

    //   // Create and save ZIP
    //   zip.generateAsync({ type: "blob" }).then((content) => {
    //     const zipFileName = `Activity_Capture_${timestamp}.zip`;
    //     saveAs(content, zipFileName);

    //     message.success("Download complete!");
    //     this.isDownloading = false;
    //   }).catch((err) => {
    //     message.error("Download failed!");
    //     this.isDownloading = false;
    //     console.error(err);
    //   });
    // },

  },
};
</script>

<style scoped>
.header-title {
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.summary-content {
  padding: 24px;
  background-color: #f4f7fb;
  min-height: 100vh;
}

.summary-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.summary-video-card,
.summary-logs-card {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  padding: 20px;
  flex: 1 1 48%;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1a1a1a;
}

.summary-video {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.no-video {
  text-align: center;
  color: #999;
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 6px;
  background: #fafafa;
}

.log-box {
  background: #f6f6f6;
  border-radius: 6px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 13px;
}
</style>
