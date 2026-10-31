/**
 * DataScraper - Popup Controller with Multi-Page Automation
 */

let scrapedData = [];
let currentFilter = 'all';
let currentSearch = '';
let isAutomationRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  initEventListeners();
  initMessageListeners();
  checkAutomationStatus();
  startScraping();
});

let el = {};

function initElements() {
  el = {
    statusBadge: document.getElementById('statusBadge'),
    statusText: document.getElementById('statusText'),
    metricTotal: document.getElementById('metricTotal'),
    metricPositive: document.getElementById('metricPositive'),
    metricNeutral: document.getElementById('metricNeutral'),
    metricNegative: document.getElementById('metricNegative'),
    barPositive: document.getElementById('barPositive'),
    barNeutral: document.getElementById('barNeutral'),
    barNegative: document.getElementById('barNegative'),

    countAll: document.getElementById('countAll'),
    countPos: document.getElementById('countPos'),
    countNeu: document.getElementById('countNeu'),
    countNeg: document.getElementById('countNeg'),

    // Automation elements
    btnToggleAutoSettings: document.getElementById('btnToggleAutoSettings'),
    autoConfigRow: document.getElementById('autoConfigRow'),
    autoLimitSelect: document.getElementById('autoLimitSelect'),
    autoDelayInput: document.getElementById('autoDelayInput'),
    autoMaxPages: document.getElementById('autoMaxPages'),
    btnStartAutomation: document.getElementById('btnStartAutomation'),
    btnStopAutomation: document.getElementById('btnStopAutomation'),
    autoProgressBar: document.getElementById('autoProgressBar'),
    autoProgressStatus: document.getElementById('autoProgressStatus'),
    autoCollectedBadge: document.getElementById('autoCollectedBadge'),

    btnDownloadCsv: document.getElementById('btnDownloadCsv'),
    btnCopyCsv: document.getElementById('btnCopyCsv'),
    btnRefresh: document.getElementById('btnRefresh'),
    btnToggleSettings: document.getElementById('btnToggleSettings'),
    settingsDrawer: document.getElementById('settingsDrawer'),

    delimiterSelect: document.getElementById('delimiterSelect'),
    chkNo: document.getElementById('chkNo'),
    chkUsername: document.getElementById('chkUsername'),
    chkUrl: document.getElementById('chkUrl'),

    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    filterPills: document.querySelectorAll('.pill'),

    tableContainer: document.getElementById('tableContainer'),
    tableBody: document.getElementById('tableBody'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptyDesc: document.getElementById('emptyDesc'),
    loadingState: document.getElementById('loadingState'),
    btnOpenTestPage: document.getElementById('btnOpenTestPage'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
  };
}

function initEventListeners() {
  // Action buttons
  el.btnDownloadCsv.addEventListener('click', downloadCsv);
  el.btnCopyCsv.addEventListener('click', copyCsv);
  el.btnRefresh.addEventListener('click', startScraping);

  // Settings toggle
  el.btnToggleSettings.addEventListener('click', () => {
    el.settingsDrawer.classList.toggle('hidden');
  });

  // Automation settings toggle
  if (el.btnToggleAutoSettings && el.autoConfigRow) {
    el.btnToggleAutoSettings.addEventListener('click', () => {
      el.autoConfigRow.classList.toggle('hidden');
    });
  }

  // Automation Start / Stop
  el.btnStartAutomation.addEventListener('click', startAutomation);
  el.btnStopAutomation.addEventListener('click', stopAutomation);

  // Search input
  el.searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    el.btnClearSearch.classList.toggle('hidden', currentSearch.length === 0);
    renderTable();
  });

  el.btnClearSearch.addEventListener('click', () => {
    el.searchInput.value = '';
    currentSearch = '';
    el.btnClearSearch.classList.add('hidden');
    renderTable();
  });

  // Filter pills
  el.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      el.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderTable();
    });
  });

  // Open Test Page helper
  el.btnOpenTestPage.addEventListener('click', () => {
    const testUrl = chrome.runtime.getURL('test_page.html');
    chrome.tabs.create({ url: testUrl });
  });
}

/**
 * Listen for live background updates from automation controller
 */
function initMessageListeners() {
  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;

    if (message.action === 'AUTOMATION_STATUS_UPDATE') {
      isAutomationRunning = message.isRunning;
      updateAutomationUiState(message.isRunning);

      if (message.data && message.data.length > 0) {
        scrapedData = message.data;
        const stats = calculateStats(scrapedData);
        updateMetrics(stats, scrapedData.length);
        renderTable();
      }

      if (message.isRunning) {
        el.autoProgressStatus.textContent = `Sedang berjalan: Halaman ${message.currentPage || 1}...`;
        el.autoCollectedBadge.textContent = `${message.totalCollected || 0} Data`;
        setStatus(`Otomasi: Halaman ${message.currentPage}`, 'ready');
      } else {
        el.autoProgressStatus.textContent = `Selesai: Total ${message.totalCollected || 0} Data`;
        el.autoCollectedBadge.textContent = `${message.totalCollected || 0} Data`;
        setStatus(`Selesai: ${message.totalCollected || 0} Data`, 'ready');
      }
    }
  });
}

/**
 * Check if automation is already running on the active tab
 */
async function checkAutomationStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'GET_AUTOMATION_STATUS' }, (res) => {
      if (chrome.runtime.lastError || !res) return;

      if (res.isRunning) {
        isAutomationRunning = true;
        updateAutomationUiState(true);
        if (res.data && res.data.length > 0) {
          scrapedData = res.data;
          updateMetrics(calculateStats(scrapedData), scrapedData.length);
          renderTable();
        }
        el.autoProgressStatus.textContent = `Sedang berjalan: Halaman ${res.currentPage}...`;
        el.autoCollectedBadge.textContent = `${res.totalCollected} Data`;
        setStatus(`Otomasi: Halaman ${res.currentPage}`, 'ready');
      }
    });
  } catch (e) {
    // Tab might not be accessible
  }
}

/**
 * Start Multi-Page Automation
 */
async function startAutomation() {
  const targetLimit = parseInt(el.autoLimitSelect.value, 10) || 100;
  let delaySec = parseInt(el.autoDelayInput.value, 10) || 3;
  if (delaySec < 3) delaySec = 3; // Ensure at least 3 seconds delay as requested!
  const maxPages = parseInt(el.autoMaxPages.value, 10) || 0;

  const config = {
    targetLimit: targetLimit,
    delaySeconds: delaySec,
    maxPages: maxPages,
    autoDownload: true,
    startFromPage1: true
  };

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showError('Tidak dapat mengakses tab aktif.');
      return;
    }

    // Ensure scripts are injected
    await ensureScriptsInjected(tab.id);

    // Send start message
    chrome.tabs.sendMessage(tab.id, { action: 'START_AUTOMATION', config: config }, (res) => {
      if (chrome.runtime.lastError || !res || !res.success) {
        showError('Gagal memulai otomasi di tab ini.');
      } else {
        isAutomationRunning = true;
        updateAutomationUiState(true);
        showToast('🚀 Otomasi dimulai! Limit 100 & Delay 3 detik aktif.');
      }
    });
  } catch (err) {
    showError(err.message || 'Gagal memulai otomasi.');
  }
}

/**
 * Stop Multi-Page Automation
 */
async function stopAutomation() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'STOP_AUTOMATION' }, (res) => {
      isAutomationRunning = false;
      updateAutomationUiState(false);
      showToast('⏹ Otomasi dihentikan!');
    });
  } catch (err) {
    console.error(err);
  }
}

function updateAutomationUiState(isRunning) {
  if (isRunning) {
    el.btnStartAutomation.classList.add('hidden');
    el.btnStopAutomation.classList.remove('hidden');
    el.autoProgressBar.classList.remove('hidden');
  } else {
    el.btnStartAutomation.classList.remove('hidden');
    el.btnStopAutomation.classList.add('hidden');
  }
}

/**
 * Ensure scraper and automation scripts are injected
 */
async function ensureScriptsInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['scripts/scraper.js', 'scripts/automation.js', 'scripts/content.js']
    });
  } catch (e) {
    // Might already be injected via manifest, perfectly fine
  }
}

/**
 * Initiates single page data scraping
 */
async function startScraping() {
  if (isAutomationRunning) return; // Don't override if automation is active

  showLoading(true);
  setStatus('Mengekstrak data...', 'pending');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showError('Tidak dapat mengakses tab aktif.');
      return;
    }

    // Try communicating with content script
    chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PAGE' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Fallback: Dynamically inject scraper function if content script not preloaded
        injectAndScrape(tab.id);
      } else {
        handleScrapeResult(response);
      }
    });
  } catch (err) {
    showError(err.message || 'Gagal mengekstrak data.');
  }
}

/**
 * Dynamic fallback injection via chrome.scripting
 */
async function injectAndScrape(tabId) {
  try {
    await ensureScriptsInjected(tabId);

    const evalResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (typeof scrapeSocialMediaData === 'function') {
          return scrapeSocialMediaData();
        }
        return { success: false, error: 'Fungsi scraper tidak ditemukan.' };
      }
    });

    if (evalResults && evalResults[0] && evalResults[0].result) {
      handleScrapeResult(evalResults[0].result);
    } else {
      showError('Gagal menjalankan scraper di halaman ini.');
    }
  } catch (err) {
    showError('Halaman ini tidak mengizinkan injeksi skrip (misalnya chrome:// atau file terbatas).');
  }
}

/**
 * Handles the scraper engine result
 */
function handleScrapeResult(res) {
  showLoading(false);

  if (!res || !res.success) {
    showError(res ? res.error : 'Tabel tidak ditemukan pada halaman ini.');
    return;
  }

  scrapedData = res.data || [];
  updateMetrics(res.stats, scrapedData.length);
  renderTable();

  if (scrapedData.length === 0) {
    showError('Tabel ditemukan namun tidak ada baris data yang terbaca.');
  } else {
    setStatus(`${scrapedData.length} Data Terdeteksi`, 'ready');
  }
}

function calculateStats(dataList) {
  let pos = 0, neu = 0, neg = 0;
  dataList.forEach(item => {
    const s = (item.sentiment || '').toLowerCase();
    if (s.includes('positive')) pos++;
    else if (s.includes('negative')) neg++;
    else neu++;
  });
  return { positive: pos, neutral: neu, negative: neg };
}

/**
 * Update summary cards and percentage bars
 */
function updateMetrics(stats, total) {
  const pos = stats ? stats.positive : 0;
  const neu = stats ? stats.neutral : 0;
  const neg = stats ? stats.negative : 0;

  el.metricTotal.textContent = total;
  el.metricPositive.textContent = pos;
  el.metricNeutral.textContent = neu;
  el.metricNegative.textContent = neg;

  el.countAll.textContent = total;
  el.countPos.textContent = pos;
  el.countNeu.textContent = neu;
  el.countNeg.textContent = neg;

  const pctPos = total > 0 ? (pos / total) * 100 : 0;
  const pctNeu = total > 0 ? (neu / total) * 100 : 0;
  const pctNeg = total > 0 ? (neg / total) * 100 : 0;

  el.barPositive.style.width = `${pctPos}%`;
  el.barNeutral.style.width = `${pctNeu}%`;
  el.barNegative.style.width = `${pctNeg}%`;
}

/**
 * Render the table rows with current search & filter
 */
function renderTable() {
  const filtered = scrapedData.filter(item => {
    // Sentiment filter
    if (currentFilter !== 'all' && item.sentiment.toLowerCase() !== currentFilter.toLowerCase()) {
      return false;
    }
    // Search query filter
    if (currentSearch) {
      const c = (item.content || '').toLowerCase();
      const u = (item.username || '').toLowerCase();
      if (!c.includes(currentSearch) && !u.includes(currentSearch)) {
        return false;
      }
    }
    return true;
  });

  el.tableBody.innerHTML = '';

  if (filtered.length === 0) {
    el.tableContainer.classList.add('hidden');
    el.emptyState.classList.remove('hidden');
    el.emptyTitle.textContent = 'Tidak Ada Data Yang Cocok';
    el.emptyDesc.textContent = 'Coba ubah kata kunci pencarian atau filter sentimen Anda.';
    return;
  }

  el.emptyState.classList.add('hidden');
  el.tableContainer.classList.remove('hidden');

  filtered.forEach((row, i) => {
    const tr = document.createElement('tr');

    // Col 1: Number
    const tdNo = document.createElement('td');
    tdNo.className = 'row-num';
    tdNo.textContent = row.no || (i + 1);
    tr.appendChild(tdNo);

    // Col 2: Content (Click to expand/collapse)
    const tdContent = document.createElement('td');
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'row-content-wrapper';

    const contentText = document.createElement('div');
    contentText.className = 'row-content';
    contentText.textContent = row.content || '(Kosong)';
    contentText.title = 'Klik untuk melihat teks lengkap';
    contentText.addEventListener('click', () => {
      contentText.classList.toggle('expanded');
    });

    contentWrapper.appendChild(contentText);
    tdContent.appendChild(contentWrapper);
    tr.appendChild(tdContent);

    // Col 3: Sentiment Badge
    const tdSentiment = document.createElement('td');
    tdSentiment.style.textAlign = 'center';

    const badge = document.createElement('span');
    badge.className = `sentiment-badge ${row.sentiment}`;
    badge.textContent = row.sentiment;
    tdSentiment.appendChild(badge);
    tr.appendChild(tdSentiment);

    el.tableBody.appendChild(tr);
  });
}

/**
 * Build CSV string adhering to RFC 4180
 */
function generateCsvString() {
  if (!scrapedData || scrapedData.length === 0) return '';

  const delimiter = el.delimiterSelect.value || ',';
  const includeNo = el.chkNo.checked;
  const includeUsername = el.chkUsername.checked;
  const includeUrl = el.chkUrl.checked;

  // Build headers
  const headers = [];
  if (includeNo) headers.push('No');
  if (includeUsername) headers.push('Username');
  headers.push('Content');
  headers.push('Sentiment');
  if (includeUrl) headers.push('Source_URL');

  const lines = [headers.map(h => escapeCsv(h, delimiter)).join(delimiter)];

  // Build rows
  scrapedData.forEach((item, idx) => {
    const rowValues = [];
    if (includeNo) rowValues.push(item.no || (idx + 1));
    if (includeUsername) rowValues.push(item.username || '');
    rowValues.push(item.content || '');
    rowValues.push(item.sentiment || '');
    if (includeUrl) rowValues.push(item.url || '');

    lines.push(rowValues.map(v => escapeCsv(v, delimiter)).join(delimiter));
  });

  return lines.join('\r\n');
}

/**
 * Escape single field for CSV (RFC 4180 standard)
 */
function escapeCsv(value, delimiter) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Download CSV file with UTF-8 BOM
 */
function downloadCsv() {
  if (!scrapedData || scrapedData.length === 0) {
    showToast('Tidak ada data untuk diekspor!');
    return;
  }

  const csvContent = generateCsvString();
  // Include UTF-8 BOM (\uFEFF) for Excel compatibility with emojis and international characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `scraped_sentiment_${timestamp}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`✅ Berhasil download ${filename}!`);
}

/**
 * Copy CSV to Clipboard
 */
async function copyCsv() {
  if (!scrapedData || scrapedData.length === 0) {
    showToast('Tidak ada data untuk disalin!');
    return;
  }

  const csvContent = generateCsvString();
  try {
    await navigator.clipboard.writeText(csvContent);
    showToast('📋 CSV disalin ke clipboard!');
  } catch (err) {
    showToast('Gagal menyalin ke clipboard.');
  }
}

/**
 * UI State Helpers
 */
function showLoading(isLoading) {
  el.loadingState.classList.toggle('hidden', !isLoading);
  if (isLoading) {
    el.tableContainer.classList.add('hidden');
    el.emptyState.classList.add('hidden');
  }
}

function showError(message) {
  showLoading(false);
  el.tableContainer.classList.add('hidden');
  el.emptyState.classList.remove('hidden');
  el.emptyTitle.textContent = 'Gagal Mengambil Data';
  el.emptyDesc.textContent = message;
  setStatus('Error', 'error');
}

function setStatus(text, state) {
  el.statusText.textContent = text;
  el.statusBadge.className = `status-badge ${state || ''}`;
}

function showToast(msg) {
  el.toastMessage.textContent = msg;
  el.toast.classList.remove('hidden');
  setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 2800);
}
