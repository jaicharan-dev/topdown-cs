(function() {
  let tooltip = null;

  function createTooltip() {
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'csf-toc-tooltip';
      document.body.appendChild(tooltip);
    }
  }

  function getDifficulty() {
    const root = document.querySelector('article') || document.querySelector('main') || document.body;
    if (!root) return '';
    const diffBadge = root.querySelector('.badge, [class*="badge--"]');
    if (!diffBadge) return '';
    const text = diffBadge.textContent.trim().toLowerCase();
    if (text.includes('easy')) return 'easy';
    if (text.includes('medium')) return 'medium';
    if (text.includes('hard')) return 'hard';
    return '';
  }

  function updateDifficulty() {
    const toc = document.querySelector('.theme-doc-toc-desktop');
    if (!toc) return;

    const diff = getDifficulty();
    if (diff) {
      if (toc.getAttribute('data-difficulty') !== diff) {
        toc.setAttribute('data-difficulty', diff);
      }
    } else {
      toc.removeAttribute('data-difficulty');
    }
  }

  function onNavigate() {
    const toc = document.querySelector('.theme-doc-toc-desktop');
    if (toc) {
      // Instantly wipe difficulty attribute so no stale color or neutral hover can occur
      toc.removeAttribute('data-difficulty');
    }

    // Fast-poll every 25ms to detect the new page's difficulty badge the instant React mounts it
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const diff = getDifficulty();
      if (diff) {
        updateDifficulty();
        clearInterval(interval);
      } else if (attempts > 40) {
        clearInterval(interval);
      }
    }, 25);
  }

  function init() {
    createTooltip();
    updateDifficulty();

    // Observe DOM mutations to immediately detect the badge upon React hydration
    const observer = new MutationObserver(() => {
      const toc = document.querySelector('.theme-doc-toc-desktop');
      if (toc && !toc.hasAttribute('data-difficulty')) {
        updateDifficulty();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // History API navigation hooks
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);

    const origPushState = history.pushState;
    history.pushState = function() {
      origPushState.apply(this, arguments);
      onNavigate();
    };

    const origReplaceState = history.replaceState;
    history.replaceState = function() {
      origReplaceState.apply(this, arguments);
      onNavigate();
    };

    // Tooltip listeners
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('.theme-doc-toc-desktop .table-of-contents__link');
      if (link && tooltip) {
        if (link.scrollWidth > link.clientWidth) {
          tooltip.textContent = link.textContent;
          tooltip.classList.add('visible');

          const rect = link.getBoundingClientRect();
          // Position 12px left of the floating 260px panel (at right: 20px)
          tooltip.style.right = '292px';

          let topPos = rect.top + rect.height / 2;
          if (topPos < 24) topPos = 24;
          if (topPos > window.innerHeight - 24) topPos = window.innerHeight - 24;

          tooltip.style.top = topPos + 'px';
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const link = e.target.closest('.theme-doc-toc-desktop .table-of-contents__link');
      if (link && tooltip) {
        tooltip.classList.remove('visible');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
