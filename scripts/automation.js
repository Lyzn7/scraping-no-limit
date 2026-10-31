/**
 * DataScraper - Multi-Page Automation Engine
 * Automates selecting Limit 100 and paging through pages with a 3-second delay.
 */

class PageAutomationController {
  constructor() {
    this.isRunning = false;
    this.currentPage = 1;
    this.collectedRows = [];
    this.overlayEl = null;
    this.config = {
      delaySeconds: 3,
      targetLimit: 100,
      maxPages: 0, // 0 = unlimited / until last page
      autoDownload: true,
      startFromPage1: true
    };
  }

  /**
   * Start multi-page automation
   */
  async start(userConfig = {}) {
    if (this.isRunning) return;

    this.config = { ...this.config, ...userConfig };
    this.isRunning = true;
    this.collectedRows = [];
    this.currentPage = 1;

    this.showOverlay();
    this.updateOverlayStatus('Memulai otomasi...', 'Mengatur limit ke 100...');

    try {
      // Step 1: Automatically select Limit 100
      this.updateOverlayStatus('Mengatur Limit 100', 'Membuka menu dropdown limit...');
      const limitSuccess = await this.selectLimit(this.config.targetLimit);
      
      // Delay at least 3 seconds to let new limit load
      await this.countdownDelay(this.config.delaySeconds, 'Menunggu data Limit 100 selesai dimuat...');

      // Step 2: Ensure on Page 1 if requested
      if (this.config.startFromPage1) {
        const page1Btn = document.querySelector('button[aria-label="page 1"], button[aria-label="Go to page 1"]');
        const isCurrentPage1 = document.querySelector('button[aria-label="page 1"][aria-current="true"], button[aria-current="true"]')?.textContent?.trim() === '1';
        
        if (page1Btn && !isCurrentPage1) {
          this.updateOverlayStatus('Navigasi ke Halaman 1', 'Berpindah ke halaman awal...');
          page1Btn.click();
          await this.countdownDelay(this.config.delaySeconds, 'Menunggu halaman 1 dimuat...');
        }
      }

      // Step 3: Paging Loop
      let pageIndex = 1;
      let hasMorePages = true;

      while (this.isRunning && hasMorePages) {
        // Determine active page number from pagination if available
        const activePageBtn = document.querySelector('.MuiPagination-root button[aria-current="true"], .MuiPagination-root .Mui-selected');
        if (activePageBtn) {
          const parsed = parseInt(activePageBtn.textContent.trim(), 10);
          if (!isNaN(parsed)) pageIndex = parsed;
        }
        this.currentPage = pageIndex;

        // Scrape current page
        this.updateOverlayStatus(`Halaman ${this.currentPage}`, `Mengekstrak data halaman ${this.currentPage}...`);
        
        if (typeof scrapeSocialMediaData === 'function') {
          const pageResult = scrapeSocialMediaData();
          if (pageResult && pageResult.success && pageResult.data) {
            const newRows = pageResult.data;
            this.addUniqueRows(newRows);
            this.updateOverlayCounts();
          }
        }

        // Check if user set max pages limit
        if (this.config.maxPages > 0 && pageIndex >= this.config.maxPages) {
          this.updateOverlayStatus('Selesai', `Telah mencapai batas maksimal ${this.config.maxPages} halaman.`);
          break;
        }

        // Check if there is a next page
        const nextButton = this.getNextPageButton();
        if (!nextButton || this.isButtonDisabled(nextButton)) {
          this.updateOverlayStatus('Selesai', 'Halaman terakhir telah tercapai.');
          hasMorePages = false;
          break;
        }

        // Delay at least 3 seconds before next page
        const delayMs = Math.max(3, this.config.delaySeconds);
        this.updateOverlayStatus(`Halaman ${this.currentPage} Selesai`, `Menunggu delay ${delayMs} detik sebelum pindah...`);
        
        const canContinue = await this.countdownDelay(delayMs, `Menuju Halaman ${pageIndex + 1}...`);
        if (!canContinue || !this.isRunning) break;

        // Click next page
        nextButton.click();

        // Wait for page transition to complete
        await this.countdownDelay(this.config.delaySeconds, `Memuat Halaman ${pageIndex + 1}...`);
        pageIndex++;
      }

      // Finished!
      this.finishAutomation();

    } catch (err) {
      this.updateOverlayStatus('Terjadi Kesalahan', err.message || 'Gagal menjalankan otomasi.');
      this.isRunning = false;
    }
  }

  /**
   * Stop automation manually
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.updateOverlayStatus('Otomasi Dihentikan', `Dihentikan oleh pengguna. Total ${this.collectedRows.length} data terkumpul.`);
    this.showFinishButtons();
    this.notifyPopup();
  }

  /**
   * Finalize automation and trigger CSV download
   */
  finishAutomation() {
    this.isRunning = false;
    this.updateOverlayStatus('🎉 Otomasi Selesai!', `Berhasil mengumpulkan ${this.collectedRows.length} data.`);
    this.showFinishButtons();
    this.notifyPopup();

    if (this.config.autoDownload && this.collectedRows.length > 0) {
      setTimeout(() => {
        this.downloadCollectedCsv();
      }, 500);
    }
  }

  /**
   * Adds rows avoiding duplicates
   */
  addUniqueRows(newRows) {
    const existingSignatures = new Set(this.collectedRows.map(r => (r.content + '||' + r.sentiment)));
    let addedCount = 0;

    newRows.forEach(r => {
      const sig = r.content + '||' + r.sentiment;
      if (!existingSignatures.has(sig)) {
        existingSignatures.add(sig);
        this.collectedRows.push({
          ...r,
          no: this.collectedRows.length + 1
        });
        addedCount++;
      }
    });

    return addedCount;
  }

  /**
   * Helper: Select rows-per-page Limit (e.g. 100)
   */
  async selectLimit(targetValue = 100) {
    const limitSelect = document.querySelector('#select-limit, [aria-labelledby*="select-limit"]');
    if (!limitSelect) {
      console.warn('Selector Limit tidak ditemukan di halaman.');
      return false;
    }

    // Check if already on target limit
    if (limitSelect.textContent.trim() === String(targetValue)) {
      return true;
    }

    // Click MUI Select button to trigger popover
    limitSelect.click();

    // Poll for popover listbox to render
    for (let attempt = 0; attempt < 12; attempt++) {
      await this.sleep(150);
      const options = Array.from(document.querySelectorAll('li[role="option"], ul[role="listbox"] li, .MuiMenuItem-root'));
      const targetOption = options.find(opt => {
        const val = opt.getAttribute('data-value') || opt.textContent.trim();
        return val === String(targetValue);
      });

      if (targetOption) {
        targetOption.click();
        return true;
      }
    }

    // Fallback: If native select exists or simulated environment
    const nativeSelect = limitSelect.parentElement?.querySelector('input, select');
    if (nativeSelect) {
      nativeSelect.value = String(targetValue);
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  /**
   * Helper: Get Next Page button
   */
  getNextPageButton() {
    // Standard aria-label
    const byAria = document.querySelector('button[aria-label="Go to next page"]');
    if (byAria) return byAria;

    // SVG icon testid
    const icon = document.querySelector('svg[data-testid="NavigateNextIcon"]');
    if (icon) {
      const btn = icon.closest('button');
      if (btn) return btn;
    }

    // Fallback in pagination nav
    const pagination = document.querySelector('.MuiPagination-root');
    if (pagination) {
      const buttons = Array.from(pagination.querySelectorAll('button'));
      if (buttons.length > 0) return buttons[buttons.length - 1];
    }

    return null;
  }

  isButtonDisabled(btn) {
    if (!btn) return true;
    return btn.disabled || 
           btn.classList.contains('Mui-disabled') || 
           btn.getAttribute('aria-disabled') === 'true' || 
           btn.getAttribute('tabindex') === '-1';
  }

  /**
   * Countdown delay with real-time UI updates
   */
  async countdownDelay(seconds, message = 'Menunggu...') {
    for (let s = seconds; s > 0; s--) {
      if (!this.isRunning) return false;
      this.updateOverlayCountdown(s, message);
      await this.sleep(1000);
    }
    return this.isRunning;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create or show floating overlay on web page
   */
  showOverlay() {
    if (this.overlayEl) {
      this.overlayEl.style.display = 'block';
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = '__datascraper_overlay__';
    overlay.innerHTML = `
      <div class="dso-card">
        <div class="dso-header">
          <div class="dso-title-area">
            <span class="dso-pulsing-dot"></span>
            <span class="dso-title">AutoScraper</span>
          </div>
          <button class="dso-btn-close" id="dsoBtnClose" title="Sembunyikan Overlay">&times;</button>
        </div>

        <div class="dso-body">
          <div class="dso-stats-row">
            <div class="dso-stat-box">
              <span class="dso-stat-label">Halaman</span>
              <span class="dso-stat-val" id="dsoPageVal">1</span>
            </div>
            <div class="dso-stat-box">
              <span class="dso-stat-label">Total Data</span>
              <span class="dso-stat-val dso-highlight" id="dsoTotalVal">0</span>
            </div>
          </div>

          <div class="dso-status-text" id="dsoStatusText">Menyiapkan otomasi...</div>
          <div class="dso-countdown-badge" id="dsoCountdownBadge">⏱ Menunggu...</div>
        </div>

        <div class="dso-actions">
          <button class="dso-btn dso-btn-danger" id="dsoBtnStop">⏹ Hentikan</button>
          <button class="dso-btn dso-btn-primary dso-hidden" id="dsoBtnDownload">📥 Download CSV</button>
        </div>
      </div>
    `;

    // Inject styles
    const style = document.createElement('style');
    style.id = '__datascraper_styles__';
    style.textContent = `
      #__datascraper_overlay__ {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        color: #f8fafc;
        user-select: none;
      }
      .dso-card {
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-radius: 12px;
        width: 290px;
        padding: 14px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 16px rgba(59, 130, 246, 0.25);
      }
      .dso-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 6px;
      }
      .dso-title-area {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dso-pulsing-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
        animation: dsoPulse 1.4s ease-in-out infinite;
      }
      @keyframes dsoPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.6; }
      }
      .dso-title {
        font-size: 13px;
        font-weight: 700;
        background: linear-gradient(135deg, #ffffff, #93c5fd);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .dso-btn-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
      }
      .dso-btn-close:hover { color: #ffffff; }
      .dso-stats-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }
      .dso-stat-box {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
      }
      .dso-stat-label {
        font-size: 10px;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 600;
      }
      .dso-stat-val {
        font-size: 17px;
        font-weight: 700;
        color: #ffffff;
      }
      .dso-highlight { color: #38bdf8 !important; }
      .dso-status-text {
        font-size: 11.5px;
        color: #cbd5e1;
        margin-bottom: 6px;
        line-height: 1.35;
      }
      .dso-countdown-badge {
        display: inline-block;
        background: rgba(59, 130, 246, 0.18);
        border: 1px solid rgba(59, 130, 246, 0.35);
        color: #60a5fa;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 10.5px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .dso-actions {
        display: flex;
        gap: 8px;
      }
      .dso-btn {
        flex: 1;
        padding: 7px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .dso-btn-danger {
        background: #e11d48;
        color: #ffffff;
      }
      .dso-btn-danger:hover { background: #be123c; }
      .dso-btn-primary {
        background: linear-gradient(135deg, #2563eb, #0284c7);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
      }
      .dso-btn-primary:hover { background: linear-gradient(135deg, #1d4ed8, #0369a1); }
      .dso-hidden { display: none !important; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    // Attach overlay events
    overlay.querySelector('#dsoBtnStop').addEventListener('click', () => this.stop());
    overlay.querySelector('#dsoBtnClose').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    overlay.querySelector('#dsoBtnDownload').addEventListener('click', () => {
      this.downloadCollectedCsv();
    });
  }

  updateOverlayStatus(title, details) {
    if (!this.overlayEl) return;
    const statusEl = this.overlayEl.querySelector('#dsoStatusText');
    if (statusEl) {
      statusEl.innerHTML = `<strong>${title}:</strong> ${details}`;
    }
    this.notifyPopup();
  }

  updateOverlayCountdown(seconds, text) {
    if (!this.overlayEl) return;
    const badge = this.overlayEl.querySelector('#dsoCountdownBadge');
    if (badge) {
      badge.textContent = `⏱ Delay ${seconds}s - ${text}`;
    }
  }

  updateOverlayCounts() {
    if (!this.overlayEl) return;
    const pageEl = this.overlayEl.querySelector('#dsoPageVal');
    const totalEl = this.overlayEl.querySelector('#dsoTotalVal');
    if (pageEl) pageEl.textContent = this.currentPage;
    if (totalEl) totalEl.textContent = this.collectedRows.length;
    this.notifyPopup();
  }

  showFinishButtons() {
    if (!this.overlayEl) return;
    const stopBtn = this.overlayEl.querySelector('#dsoBtnStop');
    const downloadBtn = this.overlayEl.querySelector('#dsoBtnDownload');
    const badge = this.overlayEl.querySelector('#dsoCountdownBadge');
    
    if (stopBtn) stopBtn.classList.add('dso-hidden');
    if (downloadBtn) downloadBtn.classList.remove('dso-hidden');
    if (badge) badge.textContent = `✅ Total ${this.collectedRows.length} data terkumpul`;
  }

  /**
   * Send state updates to extension popup if open
   */
  notifyPopup() {
    try {
      chrome.runtime.sendMessage({
        action: 'AUTOMATION_STATUS_UPDATE',
        isRunning: this.isRunning,
        currentPage: this.currentPage,
        totalCollected: this.collectedRows.length,
        data: this.collectedRows
      });
    } catch (e) {
      // Popup might be closed, perfectly normal
    }
  }

  /**
   * Export collected data to CSV with UTF-8 BOM
   */
  downloadCollectedCsv() {
    if (this.collectedRows.length === 0) return;

    // RFC 4180 CSV generation
    const lines = ['Content,Sentiment'];
    this.collectedRows.forEach(row => {
      const escape = (val) => {
        const s = String(val || '');
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      lines.push(`${escape(row.content)},${escape(row.sentiment)}`);
    });

    const csvContent = lines.join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `scraped_sentiment_all_pages_${timestamp}.csv`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Global instance in content script context
if (typeof window !== 'undefined') {
  if (!window.__automationController) {
    window.__automationController = new PageAutomationController();
  }
}
