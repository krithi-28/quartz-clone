if (!window.hasRun) {
  window.hasRun = true;

  function captureSystemInfo() {
    const systemInfo = {
      screenResolution: `${screen.width}x${screen.height}`,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    };
    chrome.storage.local.set({ systemInfo }, () => {
      // console.log("📊 System information stored.");
    });
  }

  function fetchIPAddress() {
    fetch("https://api64.ipify.org?format=json")
      .then((response) => response.json())
      .then((data) => {
        chrome.storage.local.set({ ipAddress: data.ip });
        // console.log("🌐 IP Address stored:", data.ip);
      })
      .catch((error) => console.error("❌ Error fetching IP:", error));
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "CaptureLogs") {
      // console.log("📌 Start capturing logs...");
      captureSystemInfo();
      fetchIPAddress();
      sendResponse({ success: true });
    }

    // if (message.action === "stopCapture") {
    //   console.log("⏹️ Stopping log capture...");

    //   // Show loading spinner on the web page
    //   showLoadingIndicator();

    //   // Send message to background script to detach debugger
    //   chrome.runtime.sendMessage({ action: "stopRecording" }, (response) => {
    //     if (chrome.runtime.lastError) {
    //       console.error("❌ Error stopping recording:", chrome.runtime.lastError.message);
    //       sendResponse({ success: false });
    //     } else if (response && response.success) {
    //       console.log("✅ Debugger detached successfully.");

    //       // Ensure loading is hidden only after background.js confirms detachment
    //       hideLoadingIndicator();

    //       // Now notify Vue component to proceed with redirection
    //       sendResponse({ success: true });
    //     } else {
    //       console.error("❌ Failed to detach debugger:", response?.error);
    //       hideLoadingIndicator();
    //       sendResponse({ success: false });
    //     }
    //   });

    //   return true; // Ensures the sendResponse callback remains valid
    // }
    return true;
  });

  // function showLoadingIndicator() {
  //   let loadingDiv = document.createElement("div");
  //   loadingDiv.id = "screen-recorder-loading";
  //   loadingDiv.style.position = "fixed";
  //   loadingDiv.style.top = "0";
  //   loadingDiv.style.left = "0";
  //   loadingDiv.style.width = "100vw";
  //   loadingDiv.style.height = "100vh";
  //   loadingDiv.style.background = "rgba(0, 0, 0, 0.5)";
  //   loadingDiv.style.display = "flex";
  //   loadingDiv.style.alignItems = "center";
  //   loadingDiv.style.justifyContent = "center";
  //   loadingDiv.style.zIndex = "9999";
    
  //   loadingDiv.innerHTML = `
  //     <div style="background: white; padding: 20px; border-radius: 10px; display: flex; align-items: center; gap: 10px;">
  //       <span style="font-size: 16px;">Detaching debugger...</span>
  //       <div class="spinner" style="border: 4px solid #ccc; border-top: 4px solid #007bff; width: 20px; height: 20px; border-radius: 50%; animation: spin 1s linear infinite;"></div>
  //     </div>
  //     <style>
  //       @keyframes spin {
  //         0% { transform: rotate(0deg); }
  //         100% { transform: rotate(360deg); }
  //       }
  //     </style>
  //   `;

  //   document.body.appendChild(loadingDiv);
  // }

  // function hideLoadingIndicator() {
  //   let loadingDiv = document.getElementById("screen-recorder-loading");
  //   if (loadingDiv) {
  //     loadingDiv.remove();
  //   }
  // }
}
