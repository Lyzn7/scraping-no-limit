/**
 * Content script listener for messages from popup.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;

  // Single page scrape
  if (request.action === 'SCRAPE_PAGE') {
    if (typeof scrapeSocialMediaData === 'function') {
      const result = scrapeSocialMediaData();
      sendResponse(result);
    } else if (typeof window.__scrapeSocialMediaData === 'function') {
      const result = window.__scrapeSocialMediaData();
      sendResponse(result);
    } else {
      sendResponse({
        success: false,
        error: 'Engine scraper belum termuat di halaman ini. Silakan refresh halaman dan coba kembali.'
      });
    }
  }

  // Multi-page automation: START
  else if (request.action === 'START_AUTOMATION') {
    if (window.__automationController) {
      window.__automationController.start(request.config || {});
      sendResponse({ success: true, message: 'Otomasi dimulai.' });
    } else {
      sendResponse({ success: false, error: 'Automation controller belum siap.' });
    }
  }

  // Multi-page automation: STOP
  else if (request.action === 'STOP_AUTOMATION') {
    if (window.__automationController) {
      window.__automationController.stop();
      sendResponse({ success: true, message: 'Otomasi dihentikan.' });
    } else {
      sendResponse({ success: false, error: 'Automation controller tidak aktif.' });
    }
  }

  // Multi-page automation: GET STATUS
  else if (request.action === 'GET_AUTOMATION_STATUS') {
    if (window.__automationController) {
      sendResponse({
        success: true,
        isRunning: window.__automationController.isRunning,
        currentPage: window.__automationController.currentPage,
        totalCollected: window.__automationController.collectedRows.length,
        data: window.__automationController.collectedRows
      });
    } else {
      sendResponse({ success: false, isRunning: false, totalCollected: 0, data: [] });
    }
  }

  return true; // Keep channel open for async response
});
