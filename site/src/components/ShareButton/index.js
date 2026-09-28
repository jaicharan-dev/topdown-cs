import React, { useState, useEffect, useRef } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export default function ShareButton({ title, permalink }) {
  const { siteConfig } = useDocusaurusContext();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  const baseUrl = siteConfig.url || 'https://topdowncs.com';
  const canonicalUrl = `${baseUrl}${permalink || ''}`;

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${permalink || window.location.pathname}`;
    }
    return canonicalUrl;
  };

  const shareTitle = `TopDown CS — ${title || 'Interview Question'}`;

  const handleShareClick = async (e) => {
    e.stopPropagation();

    // Check if on mobile device with native Web Share API
    const isMobileDevice = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth <= 820)
    );
    const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    if (isMobileDevice && hasNativeShare) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: getShareUrl(),
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setIsOpen(true);
        }
      }
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    const url = getShareUrl();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2400);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={styles.shareWrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.shareBtn}
        onClick={handleShareClick}
        aria-label={`Share ${title || 'question'}`}
        aria-expanded={isOpen}
      >
        <svg
          className={styles.shareIcon}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <span className={styles.shareText}>Share</span>
      </button>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Share options">
          <div className={styles.popoverHeader}>
            <span className={styles.popoverTitle}>Share Question</span>
            <button
              type="button"
              className={styles.popoverClose}
              onClick={() => setIsOpen(false)}
              aria-label="Close share menu"
            >
              ✕
            </button>
          </div>

          <div className={styles.popoverUrlBox}>
            <span className={styles.popoverUrlText}>{getShareUrl()}</span>
          </div>

          <button
            type="button"
            className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Link copied</span>
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
