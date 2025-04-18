<template>
  <a-layout class="layout">
    <a-layout-header class="header">
      <h1>Screen Activity Tracker</h1>
    </a-layout-header>

    <a-layout-content class="content">
      <div class="center-container">
        <div class="recorder-card">
          <div class="card-header">
            <VideoCameraOutlined class="icon-main" />
            <h2>Live Monitoring Dashboard</h2>
            <p>Track and log user screen activity securely & efficiently.</p>
          </div>

          <div class="card-features">
            <div class="feature">
              <SyncOutlined class="feature-icon" />
              <span>Real-Time Logging</span>
            </div>
            <div class="feature">
              <FileSearchOutlined class="feature-icon" />
              <span>Detailed Logs</span>
            </div>
            <div class="feature">
              <CloudDownloadOutlined class="feature-icon" />
              <span>Download as Zip</span>
            </div>
          </div>

          <div class="card-action">
            <a-button
              type="primary"
              size="large"
              shape="round"
              @click="startScreenRecording"
              v-if="!isRecording"
            >
              <template #icon><PlayCircleOutlined /></template>
              Start Recording
            </a-button>

            <div v-else class="recording-indicator">
              <span class="dot"></span>
              Recording in progress...
              <a-button
                type="danger"
                size="large"
                shape="round"
                @click="stopSharing"
                style="margin-left: 20px;"
              >
                <template #icon><PauseCircleOutlined /></template>
                Stop Recording
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </a-layout-content>
  </a-layout>
</template>



<script>
import { PlayCircleOutlined, PauseCircleOutlined,VideoCameraOutlined,SyncOutlined,FileSearchOutlined,CloudDownloadOutlined} from '@ant-design/icons-vue';

export default {
  name:"ScreenRecorder",
  components: {
    PlayCircleOutlined,
    PauseCircleOutlined,
    VideoCameraOutlined,
    SyncOutlined,
    FileSearchOutlined,
    CloudDownloadOutlined
  },
  data() {
    return {
      mediaRecorder: null,
      stream: null,
      recordedChunks: [],
      isRecording: false,
      recordedVideo: null,
      activeTabId: null,
      ALLOWED_DOMAIN : "https://crm.zoho.in",

    };
  },
  methods: {


//     async startScreenRecording() {
//   chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab"], async (streamId) => {
//     if (!streamId) return;

//     chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
//       const tab = tabs[0];
//       if (!tab || !tab.url) {
//         console.error("❌ No active tab or URL found.");
//         return;
//       }

//       const url = new URL(tab.url);
//       const isZohoDomain = url.hostname.endsWith("zoho.com") || url.hostname.endsWith("zoho.in");

//       if (!isZohoDomain) {
//         console.warn("⚠️ Recording cancelled: Active tab is not a Zoho domain.");
//         alert("Please switch to a Zoho tab to start screen recording.");
//         return;
//       }

//       // ✅ If domain is valid, proceed with getUserMedia and content injection
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           audio: false,
//           video: {
//             mandatory: {
//               chromeMediaSource: "desktop",
//               chromeMediaSourceId: streamId,
//             },
//           },
//         });

//         this.stream = stream;
//         this.mediaRecorder = new MediaRecorder(stream);
//         this.recordedChunks = [];

//         this.activeTabId = tab.id;
//         console.log("🎯 Chosen Tab ID:", tab.id);
//         console.log("🖥 Tab Details:", tab);

//         this.ensureContentScript(tab.id, () => {
//           // ⬇️ Send message to content script
//           chrome.tabs.sendMessage(tab.id, { action: "CaptureLogs", streamId }, (response) => {
//             if (chrome.runtime.lastError) {
//               console.error("❌ Error sending to content script:", chrome.runtime.lastError.message);
//             } else if (response?.success) {
//               console.log("✅ Content script capture started:", response);
//             } else {
//               console.log("⚠️ No response from content script:", response);
//             }
//           });

//           // ⬇️ Send message to background script
//           chrome.runtime.sendMessage({ action: "startCapture", streamId }, (response) => {
//             if (response?.success) {
//               console.log("✅ Background capture started");
//             } else {
//               console.warn("⚠️ Background capture failed:", response);
//             }
//           });

//           // Start recording
//           this.mediaRecorder.start();
//           this.isRecording = true;
//           sessionStorage.setItem("isRecording", "true");
//           console.log("🎬 Recording Started");
//         });

//         this.mediaRecorder.ondataavailable = (e) => {
//           this.recordedChunks.push(e.data);
//         };

//         this.mediaRecorder.onstop = async () => {
//           this.handleStopRecording();
//         };

//       } catch (err) {
//         console.error("❌ Error capturing screen:", err);
//       }
//     });
//   });
// },






    async startScreenRecording() {
  chrome.desktopCapture.chooseDesktopMedia(["tab"], async (streamId) => {
    if (!streamId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: streamId,
          },
        },
      });

      this.stream = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      this.recordedChunks = [];

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        this.activeTabId = tab.id;
        console.log("🎯 Chosen Tab ID:", tab.id);
        console.log("🖥 Tab Details:", tab);
        const url = new URL(tab.url);
        const isZohoDomain = url.hostname.endsWith("zoho.com") || url.hostname.endsWith("zoho.in");

        if (!isZohoDomain) {
          this.mediaRecorder.stop();
          this.isRecording=false;
          sessionStorage.setItem("isRecording", "false");
          if (this.stream && this.stream.active) {
            this.stream.getTracks().forEach((track) => track.stop());
          }
          chrome.tabs.query({}, (tabs) => {
          if (tabs.length > 0) {
            // Optionally: Find a specific tab based on title, URL, or index instead of assuming the first
            const extensionTab = tabs[0];
            const extensionUrl = "chrome-extension://ehhkjkgiabbfjhjgdmhhihlckkehanfj/index.html#/recorder";

            chrome.tabs.update(extensionTab.id, { url: extensionUrl, active: true });
            console.warn("⚠️ Recording cancelled: Active tab is not a Zoho domain.");
            alert("Please switch to a Zoho tab to start screen recording.");
          } else {
            console.warn("⚠️ No tabs found to redirect.");
          }
        });
          return;
        }

        this.ensureContentScript(tab.id, () => {
          // ⬇️ Message to content script
          chrome.tabs.sendMessage(tab.id, { action: "CaptureLogs", streamId }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("❌ Error sending to content script:", chrome.runtime.lastError.message);
            } else if (response?.success) {
              // console.log("✅ Content script capture started:", response);
            } else {
              console.log("⚠️ No response from content script:", response);
            }
          });

          // ⬇️ Message to background script
          chrome.runtime.sendMessage({ action: "startCapture", streamId }, (response) => {
            if (response?.success) {
              // console.log("✅ Background capture started");
            } else {
              console.warn("⚠️ Background capture failed:", response);
            }
          });

          // ⬇️ Start recording after ensuring scripts
          this.mediaRecorder.start();
          this.isRecording = true;
          sessionStorage.setItem("isRecording", "true");
          // console.log("🎬 Recording Started");
        });
      });

      this.mediaRecorder.ondataavailable = (e) => {
        this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.handleStopRecording();
      };
    } catch (err) {
      console.error("❌ Error capturing screen:", err);
    }
  });
},


    handleStopRecording() {
      if (this.stream && this.stream.active) {
        this.stream.getTracks().forEach((track) => track.stop());
      }

      this.isRecording = false;
      sessionStorage.setItem("isRecording", "false");

      const blobFile = new Blob(this.recordedChunks, { type: "video/webm" });

      // Convert Blob to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;

        // Save base64 video data in chrome.storage.local
        chrome.storage.local.set({ recordedVideo: base64Data }, () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to save video:", chrome.runtime.lastError.message);
          } else {
            console.log("✅ Video saved to chrome.storage.local");
          }
        });

        // Set the video URL for playback
        this.recordedVideo = base64Data;
      };

      reader.readAsDataURL(blobFile);

      // this.fetchLogs();

      if (this.activeTabId) {
        chrome.runtime.sendMessage({ action: "stopCapture" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error("❌ Error stopping capture:", chrome.runtime.lastError.message);
  } else {
    // console.log("✅ Debugger stopped in background script");

    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > 0) {
        // Optionally: Find a specific tab based on title, URL, or index instead of assuming the first
        const extensionTab = tabs[0];
        const extensionUrl = "chrome-extension://ehhkjkgiabbfjhjgdmhhihlckkehanfj/index.html#/summary";

        chrome.tabs.update(extensionTab.id, { url: extensionUrl, active: true });
      } else {
        console.warn("⚠️ No tabs found to redirect.");
      }
    });
  }
});

      }
    },

    stopSharing() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();

        // 🔁 Fallback in case onstop doesn't trigger
        setTimeout(() => {
          if (this.isRecording) this.handleStopRecording();
        }, 1000);
      }
    },


    ensureContentScript(tabId, callback) {
        if (!tabId) {
            console.error("❌ Invalid tabId provided to inject content script.");
            return;
        }

        // console.log(`✅ Injecting content script into tab ${tabId}...`);

        chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
        }).then(() => {
            // console.log(`✅ Content & Inject scripts injected into tab ${tabId}`);
            if (callback) callback();
        }).catch((error) => {
            console.error(`❌ Error injecting content script:`, error);
        });
    },
  }
};
</script>


<style scoped>
.layout {
  min-height: 100vh;
  background: linear-gradient(to right, #eef2f3, #f9f9f9);
}

.header {
  background-color: #fff;
  padding: 0 40px;
  display: flex;
  align-items: center;
  height: 64px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header h1 {
  font-size: 22px;
  color: #333;
  margin: 0;
}

.content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 16px;
}

.center-container {
  width: 100%;
  max-width: 600px;
}

.recorder-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.card-header h2 {
  margin-top: 12px;
  font-size: 24px;
  color: #1f1f1f;
}

.card-header p {
  color: #888;
  font-size: 14px;
  margin-top: 4px;
}

.icon-main {
  font-size: 48px;
  color: #1890ff;
}

.card-features {
  display: flex;
  justify-content: space-between;
  margin: 30px 0;
}

.feature {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.feature-icon {
  font-size: 28px;
  color: #52c41a;
  margin-bottom: 6px;
}

.feature span {
  font-size: 13px;
  color: #555;
}

.card-action {
  margin-top: 20px;
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


