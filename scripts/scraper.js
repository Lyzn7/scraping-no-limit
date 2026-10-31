/**
 * Social Data Scraper - Content & Sentiment Extraction Engine
 * Specifically designed for Material-UI and social media analytics tables (test.php structure).
 */

function scrapeSocialMediaData() {
  try {
    // 1. Locate the target table
    const table = document.querySelector('table.MuiTable-root') || document.querySelector('table');
    if (!table) {
      return {
        success: false,
        error: 'Tabel data tidak ditemukan di halaman ini. Pastikan Anda berada di halaman tabel analitik.'
      };
    }

    // 2. Identify column indices dynamically from <thead> if available
    let contentColIndex = -1;
    let sentimentColIndex = -1;
    let noColIndex = -1;

    const thElements = Array.from(table.querySelectorAll('thead th'));
    if (thElements.length > 0) {
      thElements.forEach((th, idx) => {
        const text = (th.innerText || th.textContent || '').trim().toLowerCase();
        if (/content|konten|post|pesan/i.test(text) && contentColIndex === -1) {
          contentColIndex = idx;
        } else if (/sentiment|sentimen/i.test(text) && sentimentColIndex === -1) {
          sentimentColIndex = idx;
        } else if (/^no$|^#$/i.test(text) && noColIndex === -1) {
          noColIndex = idx;
        }
      });
    }

    // Fallbacks based on test.php schema (Col 1: No, Col 2: Content, Col 12: Sentiment)
    if (contentColIndex === -1) contentColIndex = 2;
    if (sentimentColIndex === -1) sentimentColIndex = 12;
    if (noColIndex === -1) noColIndex = 1;

    // 3. Extract rows from <tbody>
    const tbody = table.querySelector('tbody') || table;
    const trElements = Array.from(tbody.querySelectorAll('tr'));
    const scrapedRows = [];

    let countPositive = 0;
    let countNeutral = 0;
    let countNegative = 0;

    trElements.forEach((tr, index) => {
      // Skip pagination/footer rows (often have colspan or very few cells)
      if (tr.querySelector('td[colspan]')) return;
      const cells = Array.from(tr.querySelectorAll('td'));
      if (cells.length < 5) return;

      // Extract Content
      let contentText = '';
      const contentCell = cells[contentColIndex];
      let username = '';
      let sourceUrl = '';

      if (contentCell) {
        // Optional: extract username if present
        const usernameEl = contentCell.querySelector('.MuiTypography-subtitle2');
        if (usernameEl && (usernameEl.closest('.MuiAvatar-root') || usernameEl.previousElementSibling?.querySelector('.MuiAvatar-root') || usernameEl.parentElement?.querySelector('.MuiAvatar-root'))) {
          username = usernameEl.textContent.trim();
        }

        // Optional: extract link to source
        const linkEl = contentCell.querySelector('a[href]');
        if (linkEl) {
          sourceUrl = linkEl.getAttribute('href') || '';
        }

        // Main content extraction strategy:
        // Check for typography divs with aria-label (preserves full un-truncated multiline text)
        const ariaDivs = Array.from(contentCell.querySelectorAll('div[aria-label]')).filter(el => {
          // Avoid avatar, action buttons, or links
          return !el.closest('.MuiAvatar-root') && !el.closest('a') && !el.closest('button');
        });

        if (ariaDivs.length > 0) {
          // In some cases (e.g. YouTube), there is Title div + Description div
          contentText = ariaDivs
            .map(el => (el.getAttribute('aria-label') || el.textContent || '').trim())
            .filter(Boolean)
            .join('\n\n');
        }

        // Fallback: Clone content cell and clean unwanted tags
        if (!contentText) {
          const clone = contentCell.cloneNode(true);
          // Remove link container
          clone.querySelectorAll('a').forEach(a => a.remove());
          // Remove buttons and icons
          clone.querySelectorAll('button, svg').forEach(b => b.remove());
          // Remove user avatar container
          const avatar = clone.querySelector('.MuiAvatar-root');
          if (avatar && avatar.parentElement) {
            avatar.parentElement.remove();
          }
          contentText = (clone.innerText || clone.textContent || '').trim();
        }
      }

      // Extract Sentiment
      let sentimentValue = '';
      const sentimentCell = cells[sentimentColIndex];

      if (sentimentCell) {
        // Direct text check: "Positive", "Neutral", "Negative"
        const cellText = (sentimentCell.innerText || sentimentCell.textContent || '').trim();
        const textMatch = cellText.match(/(Positive|Neutral|Negative)/i);

        if (textMatch) {
          sentimentValue = textMatch[1].charAt(0).toUpperCase() + textMatch[1].slice(1).toLowerCase();
        } else {
          // Interactive rating icon check (e.g., Row 14 in test.php)
          // Look for active icons (not ending in 'OffAltIcon')
          const thumbUp = sentimentCell.querySelector('svg[data-testid="ThumbUpAltIcon"]');
          const thumbDown = sentimentCell.querySelector('svg[data-testid="ThumbDownAltIcon"]');

          if (thumbUp) {
            sentimentValue = 'Positive';
          } else if (thumbDown) {
            sentimentValue = 'Negative';
          } else {
            // Check SVG with aria-label that does not have "Off" in testid
            const svgs = Array.from(sentimentCell.querySelectorAll('svg[aria-label]'));
            const activeSvg = svgs.find(s => {
              const testid = s.getAttribute('data-testid') || '';
              return !testid.includes('Off');
            });

            if (activeSvg) {
              const label = activeSvg.getAttribute('aria-label') || '';
              if (/positive/i.test(label)) sentimentValue = 'Positive';
              else if (/negative/i.test(label)) sentimentValue = 'Negative';
              else sentimentValue = 'Neutral';
            } else {
              sentimentValue = 'Neutral';
            }
          }
        }
      }

      // Default fallback
      if (!sentimentValue) sentimentValue = 'Neutral';

      // Update counters
      const lowerSent = sentimentValue.toLowerCase();
      if (lowerSent.includes('positive')) countPositive++;
      else if (lowerSent.includes('negative')) countNegative++;
      else countNeutral++;

      // Row number
      let rowNum = scrapedRows.length + 1;
      if (cells[noColIndex]) {
        const parsedNum = parseInt(cells[noColIndex].textContent.trim(), 10);
        if (!isNaN(parsedNum)) rowNum = parsedNum;
      }

      scrapedRows.push({
        no: rowNum,
        content: contentText,
        sentiment: sentimentValue,
        username: username,
        url: sourceUrl
      });
    });

    return {
      success: true,
      total: scrapedRows.length,
      stats: {
        positive: countPositive,
        neutral: countNeutral,
        negative: countNegative
      },
      data: scrapedRows
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan saat mengekstrak data dari halaman.'
    };
  }
}

// Make available globally or for message listeners
if (typeof window !== 'undefined') {
  window.__scrapeSocialMediaData = scrapeSocialMediaData;
}
