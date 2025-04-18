let activeTabId = null; // ✅ Store the active tab ID
let isRecording = false; // ✅ Prevent duplicate recording

chrome.runtime.onStartup.addListener(() => {
  console.log("🔄 Extension started. Clearing local storage...");
  chrome.storage.local.clear(() => {
    console.log("✅ Storage cleared on startup.");
  });
});


chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear(() => {
    console.log("✅ Storage cleared on install/update.");
  });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.windows.getCurrent({ populate: true }, (currentWindow) => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html#/recorder'),
      windowId: currentWindow.id,
      index: 0,
      active: true
    }, (newTab) => {
      // Wait until the tab is fully loaded
      const checkTabStatus = setInterval(() => {
        chrome.tabs.get(newTab.id, (tabInfo) => {
          if (tabInfo.status === 'complete') {
            clearInterval(checkTabStatus);
          }
        });
      }, 300);
    });
  });
});

let attachedTargets = [];
let reattachInterval = null;

function startAutoReattach(activeTabId, activeTabUrl) {
  if (reattachInterval) clearInterval(reattachInterval);

  reattachInterval = setInterval(() => {
    chrome.debugger.getTargets((targets) => {
      const freshTargets = targets.filter((t) =>
        isValidZohoTarget(t, activeTabId, activeTabUrl) &&
        !attachedTargets.includes(t.id) // ✅ Skip already attached
      );

      if (freshTargets.length > 0) {
        console.log("🔄 Auto-reattaching to new widget(s):", freshTargets.map(t => t.id));
        attachDebugger(freshTargets);
        attachedTargets.push(...freshTargets.map(t => t.id));
      }
    });
  }, 2000); // every 2 seconds (adjust as needed)
}

function stopAutoReattach() {
  if (reattachInterval) {
    clearInterval(reattachInterval);
    reattachInterval = null;
  }
}


function isValidZohoTarget(target, activeTabId, activeTabUrl) {
  if (target.attached) return false;
  if (!/^https?:\/\//.test(target.url)) return false;

  const isSameTab = target.tabId === activeTabId;

  const activeOrigin = new URL(activeTabUrl).origin;
a
  const isTrustedWidget = !target.tabId &&
    (target.type === "iframe" || target.type === "other") &&
    (
      target.url.includes(".zoho.") ||
      target.url.includes(".zappsusercontent.")
    ) &&
    (
      target.url.includes(`frameorigin=${encodeURIComponent(activeOrigin)}`) ||
      target.url.includes(`serviceOrigin=${encodeURIComponent(activeOrigin)}`)
    );

  return (isSameTab || isTrustedWidget) &&
    (target.type === "page" || target.type === "iframe" || target.type === "other");
}



// function isValidZohoTarget(target, activeTabId) {
//   if (target.attached) return false;
//   if (!/^https?:\/\//.test(target.url)) return false;

//   const isSameTab = target.tabId === activeTabId;
//   const isZohoWidget = !target.tabId && target.url.includes(".zoho.") && target.url !== "";

//   return (isSameTab || isZohoWidget) &&
//     (target.type === "page" || target.type === "iframe" || target.type === "other");
// }

function attachDebugger(targets) {
  targets.forEach((target) => {
    chrome.debugger.attach({ targetId: target.id }, "1.3", () => {
      if (chrome.runtime.lastError) {
        console.error("❌ Attach failed:", chrome.runtime.lastError.message);
        return;
      }

      // console.log("✅ Attached to:", target.id, target.url);

      chrome.debugger.sendCommand({ targetId: target.id }, "Console.enable");
      chrome.debugger.sendCommand({ targetId: target.id }, "Network.enable");
      chrome.debugger.sendCommand({ targetId: target.id }, "Runtime.enable");
      chrome.debugger.sendCommand({ targetId: target.id }, "Log.enable");
    });
  });
}

// function handleStartCapture(sendResponse) {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     if (tabs.length === 0) {
//       console.warn("⚠️ No active tab found");
//       sendResponse({ success: false, error: "No active tab" });
//       return;
//     }

//     const activeTab = tabs[0];
//     const activeTabId = activeTab.id;
//     const activeOrigin = new URL(activeTab.url).origin;

//     chrome.debugger.getTargets((targets) => {
//       console.log("🔍 All Debuggable Targets:");
//       targets.forEach((t) =>
//         console.log(`- ${t.url} | tabId: ${t.tabId || "null"} | type: ${t.type}`)
//       );

//       // const relatedTargets = targets.filter((t) =>
//       //   isValidZohoTarget(t, activeTabId)
//       // );

//       const relatedTargets = targets.filter((t) =>
//         isValidZohoTarget(t, activeTabId, activeTab.url)
//       );      
      

//       if (relatedTargets.length === 0) {
//         console.warn("⚠️ No suitable targets found");
//         sendResponse({ success: false, error: "No related targets found" });
//         return;
//       }

//       attachedTargets = relatedTargets.map((target) => target.id);
//       attachDebugger(relatedTargets);
//       sendResponse({ success: true });
//     });
//   });
// }
function handleStartCapture(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      console.warn("⚠️ No active tab found");
      sendResponse({ success: false, error: "No active tab" });
      return;
    }

    const activeTab = tabs[0];
    const activeTabId = activeTab.id;
    const activeOrigin = new URL(activeTab.url).origin;

    chrome.debugger.getTargets((targets) => {
      const relatedTargets = targets.filter((t) =>
        isValidZohoTarget(t, activeTabId, activeTab.url)
      );

      if (relatedTargets.length === 0) {
        console.warn("⚠️ No suitable targets found");
        sendResponse({ success: false, error: "No related targets found" });
        return;
      }

      attachedTargets = relatedTargets.map((target) => target.id);
      attachDebugger(relatedTargets);

      // ✅ Start polling for new widget targets
      startAutoReattach(activeTabId, activeTab.url);

      sendResponse({ success: true });
    });
  });
}


// function handleStopCapture(sendResponse) {
//   if (attachedTargets.length === 0) {
//     console.warn("⚠️ No attached targets to detach.");
//     sendResponse({ success: false, error: "No attached targets" });
//     return;
//   }

//   let count = 0;
//   attachedTargets.forEach((targetId) => {
//     chrome.debugger.detach({ targetId }, () => {
//       count++;
//       if (count === attachedTargets.length) {
//         attachedTargets = [];
//         console.log("✅ All targets detached.");
//         sendResponse({ success: true });
//       }
//     });
//   });
// }

function handleStopCapture(sendResponse) {
  if (attachedTargets.length === 0) {
    console.warn("⚠️ No attached targets to detach.");
    sendResponse({ success: false, error: "No attached targets" });
    return;
  }

  let count = 0;
  attachedTargets.forEach((targetId) => {
    chrome.debugger.detach({ targetId }, () => {
      count++;
      if (count === attachedTargets.length) {
        attachedTargets = [];
        console.log("✅ All targets detached.");

        // ✅ Stop auto polling
        stopAutoReattach();

        sendResponse({ success: true });
      }
    });
  });
}


// function handleLogTargets() {
//   chrome.debugger.getTargets((targets) => {
//     console.log("🔎 All Targets:", targets);
//   });
// }

// 🔌 Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log("📩 Message received:", message);

  switch (message.action) {
    case "startCapture":
      handleStartCapture(sendResponse);
      return true; // async

    case "stopCapture":
      handleStopCapture(sendResponse);
      return true; // async

    // case "logTargets":
    //   handleLogTargets();
    //   break;

    default:
      console.warn("❓ Unknown action:", message.action);
  }
});


// Track attached targets
// const attachedTargets = [];

// Log saving queue & lock
let isWritingLogs = false;
let recentLogs = new Set();
const LOG_TIMEOUT_MS = 100;

const logQueue = [];

function saveLogToStorage(newLog) {
  const uniqueKey = `${newLog.level}:${newLog.text}`;

  if (recentLogs.has(uniqueKey)) return; // Duplicate — skip

  recentLogs.add(uniqueKey);
  setTimeout(() => recentLogs.delete(uniqueKey), LOG_TIMEOUT_MS);

  logQueue.push(newLog);
  if (!isWritingLogs) {
    processLogQueue();
  }
}


function processLogQueue() {
  if (logQueue.length === 0) {
    isWritingLogs = false;
    return;
  }

  isWritingLogs = true;



  chrome.storage.local.get({ logs: [] }, (result) => {
    const logs = result.logs || [];
    const logToAdd = logQueue.shift();

    logs.push(logToAdd);
    if (logs.length > 1000) logs.shift(); // Optional: keep logs trimmed

    chrome.storage.local.set({ logs }, () => {
      if (chrome.runtime.lastError) {
        console.warn("⚠️ Error saving log:", chrome.runtime.lastError.message);
      }

      // Process next log in queue
      processLogQueue();
    });
  });
}

// Main debugger listener
chrome.debugger.onEvent.addListener((debuggeeId, method, params) => {
  if (!attachedTargets.includes(debuggeeId.targetId)) return;

  // ✅ Console logs
  if (
    method === "Console.messageAdded" ||
    method === "Runtime.consoleAPICalled" ||
    method === "Log.entryAdded"
  ) {
    const logEntry = params.message || params.entry || params;
    let messageText = "";

    try {
      if (logEntry.args && Array.isArray(logEntry.args)) {
        messageText = logEntry.args.map(arg => arg.value || JSON.stringify(arg)).join(" ");
      } else {
        messageText = logEntry.text || logEntry.message || JSON.stringify(logEntry);
      }
    } catch (err) {
      messageText = "⚠️ Error parsing log: " + err.message;
    }

    // console.log("📥 Captured Log:", messageText);

    // Use safe log saver
    saveLogToStorage({
      level: logEntry.level || "log",
      text: messageText,
      timestamp: new Date().toISOString(),
    });
  }

  // 🌐 Request capture
  if (method === "Network.requestWillBeSent") {
    const request = params.request;

    chrome.storage.local.get({ networkLogs: [] }, (result) => {
      const networkLogs = result.networkLogs;
      networkLogs.push({
        type: "request",
        requestId: params.requestId,
        url: request.url,
        method: request.method,
        headers: request.headers,
        timestamp: new Date().toISOString(),
      });

      chrome.storage.local.set({ networkLogs });
    });
  }

  // 🌐 Response capture
  if (method === "Network.responseReceived") {
    const response = params.response;

    chrome.debugger.sendCommand(
      { targetId: debuggeeId.targetId },
      "Network.getResponseBody",
      { requestId: params.requestId },
      (bodyResponse) => {
        let responseBody;

        if (chrome.runtime.lastError) {
          console.warn("⚠️ getResponseBody failed:", chrome.runtime.lastError.message);
          responseBody = "⚠️ Response body not available";
        } else if (bodyResponse?.base64Encoded) {
          responseBody = "⚠️ Response is Base64-encoded (binary data)";
        } else {
          responseBody = bodyResponse?.body || "⚠️ Response body not available";
        }

        chrome.storage.local.get({ networkLogs: [] }, (result) => {
          const networkLogs = result.networkLogs;
          networkLogs.push({
            type: "response",
            requestId: params.requestId,
            url: response.url,
            status: response.status,
            headers: response.headers,
            mimeType: response.mimeType,
            body: responseBody,
            timestamp: new Date().toISOString(),
          });

          chrome.storage.local.set({ networkLogs });
        });
      }
    );
  }
});




// let attachedTargets = [];

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log("📩 Message received:", message);

//   if (message.action === "startCapture") {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs.length === 0) {
//         console.warn("⚠️ No active tab found");
//         sendResponse({ success: false, error: "No active tab" });
//         return;
//       }

//       const activeTab = tabs[0];
//       const activeTabId = activeTab.id;
//       const activeOrigin = new URL(activeTab.url).origin;

//       chrome.debugger.getTargets((targets) => {
//         console.log("🔍 All Debuggable Targets:");
//         targets.forEach((t) =>
//           console.log(`- ${t.url} | tabId: ${t.tabId || "null"} | type: ${t.type}`)
//         );

//         const isValidTarget = (t) => {
//           if (t.attached) return false;
//           if (!/^https?:\/\//.test(t.url)) return false;

//           const sameTab = t.tabId === activeTabId;
//           const isZohoWidget =
//             !t.tabId && t.url.includes(".zoho.") && t.url !== ""; // excludes blank sandboxed iframes

//           return (sameTab || isZohoWidget) &&
//             (t.type === "page" || t.type === "iframe" || t.type === "other");
//         };

//         const relatedTargets = targets.filter(isValidTarget);

//         if (relatedTargets.length === 0) {
//           console.warn("⚠️ No suitable targets found");
//           sendResponse({ success: false, error: "No related targets found" });
//           return;
//         }

//         attachedTargets = relatedTargets.map((target) => target.id);

//         relatedTargets.forEach((target) => {
//           chrome.debugger.attach({ targetId: target.id }, "1.3", () => {
//             if (chrome.runtime.lastError) {
//               console.error("❌ Attach failed:", chrome.runtime.lastError.message);
//               return;
//             }

//             console.log("✅ Attached to:", target.id, target.url);

//             chrome.debugger.sendCommand({ targetId: target.id }, "Console.enable");
//             chrome.debugger.sendCommand({ targetId: target.id }, "Network.enable");
//             chrome.debugger.sendCommand({ targetId: target.id }, "Runtime.enable");
//             chrome.debugger.sendCommand({ targetId: target.id }, "Log.enable");
//           });
//         });

//         sendResponse({ success: true });
//       });
//     });

//     return true;
//   }

//   if (message.action === "stopCapture") {
//     if (attachedTargets.length === 0) {
//       console.warn("⚠️ No attached targets to detach.");
//       sendResponse({ success: false, error: "No attached targets" });
//       return;
//     }

//     let count = 0;
//     attachedTargets.forEach((targetId) => {
//       chrome.debugger.detach({ targetId }, () => {
//         count++;
//         if (count === attachedTargets.length) {
//           attachedTargets = [];
//           console.log("✅ All targets detached.");
//           sendResponse({ success: true });
//         }
//       });
//     });

//     return true;
//   }

//   if (message.action === "logTargets") {
//     chrome.debugger.getTargets((targets) => {
//       console.log("🔎 All Targets:", targets);
//     });
//   }
// });

// 🔁 Capture logs and network events
// chrome.debugger.onEvent.addListener((debuggeeId, method, params) => {
//   if (!attachedTargets.includes(debuggeeId.targetId)) return;

//   if (
//     method === "Console.messageAdded" ||
//     method === "Runtime.consoleAPICalled" ||
//     method === "Log.entryAdded"
//   ) {
//     const logEntry = params.message || params.entry || params;
//     let messageText = "";
  
//     try {
//       if (logEntry.args && Array.isArray(logEntry.args)) {
//         messageText = logEntry.args.map(arg => arg.value || JSON.stringify(arg)).join(" ");
//       } else {
//         messageText = logEntry.text || logEntry.message || JSON.stringify(logEntry);
//       }
//     } catch (err) {
//       messageText = "⚠️ Error parsing log: " + err.message;
//     }
  
//     console.log("📥 Captured Log:", messageText);
  
//     chrome.storage.local.get("logs", (result) => {
//       const logs = result.logs || [];
//       logs.push({
//         level: logEntry.level || "log",
//         text: messageText,
//         timestamp: new Date().toISOString(),
//       });
  
//       if (logs.length > 1000) logs.shift(); // Trim if needed
  
//       chrome.storage.local.set({ logs }, () => {
//         if (chrome.runtime.lastError) {
//           console.warn("⚠️ Storage error:", chrome.runtime.lastError.message);
//         } else {
//           console.log("✅ Log saved");
//         }
//       });
//     });
//   }
  

//   if (method === "Network.requestWillBeSent") {
//     const request = params.request;

//     chrome.storage.local.get({ networkLogs: [] }, (result) => {
//       const networkLogs = result.networkLogs;
//       networkLogs.push({
//         type: "request",
//         requestId: params.requestId,
//         url: request.url,
//         method: request.method,
//         headers: request.headers,
//         timestamp: new Date().toISOString(),
//       });

//       chrome.storage.local.set({ networkLogs });
//     });
//   }

//   if (method === "Network.responseReceived") {
//     const response = params.response;

//     chrome.debugger.sendCommand(
//       { targetId: debuggeeId.targetId },
//       "Network.getResponseBody",
//       { requestId: params.requestId },
//       (bodyResponse) => {
//         let responseBody;

//         if (chrome.runtime.lastError) {
//           console.warn("⚠️ getResponseBody failed:", chrome.runtime.lastError.message);
//           responseBody = "⚠️ Response body not available";
//         } else if (bodyResponse?.base64Encoded) {
//           responseBody = "⚠️ Response is Base64-encoded (binary data)";
//         } else {
//           responseBody = bodyResponse?.body || "⚠️ Response body not available";
//         }

//         chrome.storage.local.get({ networkLogs: [] }, (result) => {
//           const networkLogs = result.networkLogs;
//           networkLogs.push({
//             type: "response",
//             requestId: params.requestId,
//             url: response.url,
//             status: response.status,
//             headers: response.headers,
//             mimeType: response.mimeType,
//             body: responseBody,
//             timestamp: new Date().toISOString(),
//           });

//           chrome.storage.local.set({ networkLogs });
//         });
//       }
//     );
//   }
// });




// let activeTabId = null;
// let attachedTargets = [];
// // let isRecording = false;

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log("📩 Message received in background.js:", message);

//   if (message.action === "startCapture") {
//     console.log("📌 Start capturing logs...");

//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs.length === 0) {
//         console.warn("⚠️ No active tab found!");
//         sendResponse({ success: false, error: "No active tab" });
//         return;
//       }

//       activeTabId = tabs[0].id;
//       console.log("📌 Active Tab ID:", activeTabId);

//       chrome.debugger.getTargets((targets) => {
//         const relatedTargets = targets.filter(
//           (t) => t.tabId === activeTabId && (t.type === "page" || t.type === "iframe")
//         );

//         if (relatedTargets.length === 0) {
//           console.warn("⚠️ No related targets found for tab");
//           sendResponse({ success: false, error: "No related targets found" });
//           return;
//         }

//         attachedTargets = relatedTargets.map((target) => target.id);

//         relatedTargets.forEach((target) => {
//           chrome.debugger.attach({ targetId: target.id }, "1.3", () => {
//             if (chrome.runtime.lastError) {
//               console.error("❌ Error attaching to target:", chrome.runtime.lastError.message);
//               return;
//             }

//             console.log("✅ Attached to target ID:", target.id);

//             chrome.debugger.sendCommand({ targetId: target.id }, "Console.enable");
//             chrome.debugger.sendCommand({ targetId: target.id }, "Network.enable");
//           });
//         });

//         chrome.debugger.onEvent.addListener(handleDebuggerEvent);

//         sendResponse({ success: true });
//       });
//     });

//     return true;
//   }

//   if (message.action === "stopCapture") {
//     console.log("⏹️ Stopping log capture...");
//     let responseSent = false;

//     if (attachedTargets.length > 0) {
//       let detachCount = 0;

//       attachedTargets.forEach((targetId) => {
//         chrome.debugger.detach({ targetId }, () => {
//           detachCount++;
//           if (detachCount === attachedTargets.length) {
//             console.log("✅ All debuggers detached");
//             attachedTargets = [];
//             activeTabId = null;
//             isRecording = false;
//             sendResponse({ success: true });
//             responseSent = true;
//           }
//         });
//       });
//     } else {
//       console.warn("⚠️ No active debugger to detach.");
//       sendResponse({ success: false, error: "No attached targets" });
//       responseSent = true;
//     }

//     setTimeout(() => {
//       if (!responseSent) {
//         sendResponse({ success: false, error: "Timeout: No response sent" });
//       }
//     }, 1000);

//     return true;
//   }
// });

// function handleDebuggerEvent(debuggeeId, method, params) {
//   if (!attachedTargets.includes(debuggeeId.targetId)) return;

//   if (method === "Console.messageAdded") {
//     const message = params.message;

//     chrome.storage.local.get({ logs: [] }, (result) => {
//       const logs = result.logs;

//       let messageText;
//       try {
//         if (message.args && Array.isArray(message.args)) {
//           messageText = message.args.map(arg => {
//             if (arg.type === "object") {
//               return arg.preview ? arg.preview.properties : JSON.stringify(arg, null, 2);
//             }
//             return arg.value ? arg.value : JSON.stringify(arg, null, 2);
//           });
//         } else {
//           messageText = message.text;
//         }
//       } catch (error) {
//         console.error("❌ Error processing log message:", error);
//         messageText = "Error parsing message";
//       }

//       logs.push({
//         level: message.level,
//         text: messageText,
//         timestamp: new Date().toISOString(),
//       });

//       chrome.storage.local.set({ logs });
//     });
//   }

//   if (method === "Network.requestWillBeSent") {
//     const request = params.request;

//     chrome.storage.local.get({ networkLogs: [] }, (result) => {
//       const networkLogs = result.networkLogs;
//       networkLogs.push({
//         type: "request",
//         requestId: params.requestId,
//         url: request.url,
//         method: request.method,
//         headers: request.headers,
//         timestamp: new Date().toISOString(),
//       });

//       chrome.storage.local.set({ networkLogs });
//     });
//   }

//   if (method === "Network.responseReceived") {
//     const response = params.response;

//     chrome.debugger.sendCommand(
//       { targetId: debuggeeId.targetId },
//       "Network.getResponseBody",
//       { requestId: params.requestId },
//       (bodyResponse) => {
//         let responseBody;

//         if (chrome.runtime.lastError) {
//           console.warn("⚠️ getResponseBody failed:", chrome.runtime.lastError.message);
//           responseBody = "⚠️ Response body not available";
//         } else if (bodyResponse?.base64Encoded) {
//           responseBody = "⚠️ Response is Base64-encoded (binary data)";
//         } else {
//           responseBody = bodyResponse?.body || "⚠️ Response body not available";
//         }

//         chrome.storage.local.get({ networkLogs: [] }, (result) => {
//           const networkLogs = result.networkLogs;
//           networkLogs.push({
//             type: "response",
//             requestId: params.requestId,
//             url: response.url,
//             status: response.status,
//             headers: response.headers,
//             mimeType: response.mimeType,
//             body: responseBody,
//             timestamp: new Date().toISOString(),
//           });

//           chrome.storage.local.set({ networkLogs });
//         });
//       }
//     );
//   }
// }


