import React, {useCallback, useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import styles from './OlympiadExpertPromoBanner.css';
import {node_process} from '../lib/platform';

const STORAGE_KEY = 'rs3_promo_olympiad_expert_2026_dismissed';
const BANNER_SRC = './static/promo/olympiad-expert-2026.png';
/** Dev/test: always show banner (ignore localStorage dismiss). Set false before release. */
const FORCE_SHOW_PROMO = false;

const LINK_APPLY = 'https://robbo.ru/olymp/expert/';
const LINK_INFO = 'https://creativeprogramming.org/';
const LINK_MAIL = 'mailto:scratch@creativeprogramming.org';

const EXTERNAL_LINK_PROPS = {
    target: '_blank',
    rel: 'noopener noreferrer'
};

/** Design size in CSS px at browser zoom 100%. */
const BANNER_WIDTH_PX = 1280;
const CTA_FONT_PX = BANNER_WIDTH_PX * 0.015;

/**
 * Browser page zoom (Ctrl+/-). Not OS scale / devicePixelRatio.
 * outer/inner diverges when the page is zoomed; ~1 at 100%.
 */
function getPageZoom () {
    if (typeof window === 'undefined') {
        return 1;
    }
    const {innerWidth, outerWidth} = window;
    if (!(innerWidth > 0) || !(outerWidth > 0)) {
        return 1;
    }
    const zoom = outerWidth / innerWidth;
    if (!Number.isFinite(zoom) || zoom < 0.5 || zoom > 4) {
        return 1;
    }
    // Ignore scrollbar / chrome noise around 100%
    if (Math.abs(zoom - 1) < 0.07) {
        return 1;
    }
    return zoom;
}

function bannerSizeStyle () {
    const zoom = getPageZoom();
    return {
        '--banner-w': `${BANNER_WIDTH_PX / zoom}px`,
        '--cta-font': `${CTA_FONT_PX / zoom}px`
    };
}

function getPromoHost () {
    if (typeof window === 'undefined') {
        return '';
    }
    return window.location.hostname || '';
}

function isWebPromoHost () {
    if (typeof window === 'undefined') {
        return false;
    }
    // Desktop NW.js sets platform; skip promo there.
    if (node_process && node_process.platform) {
        return false;
    }
    const host = getPromoHost();
    return (
        host === 'scratch.ru' ||
        host === 'www.scratch.ru' ||
        host.endsWith('.scratch.ru') ||
        host === 'localhost' ||
        host === '127.0.0.1'
    );
}

function wasDismissed () {
    if (FORCE_SHOW_PROMO) {
        return false;
    }
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function markDismissed () {
    if (FORCE_SHOW_PROMO) {
        return;
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
        // ignore quota / private mode
    }
}

function OlympiadExpertPromoBanner () {
    const [visible, setVisible] = useState(false);
    const [sizeStyle, setSizeStyle] = useState(bannerSizeStyle);

    useEffect(() => {
        if (!isWebPromoHost()) {
            return;
        }
        if (wasDismissed()) {
            return;
        }
        setVisible(true);
    }, []);

    useEffect(() => {
        if (!visible) {
            return undefined;
        }
        const syncSize = () => setSizeStyle(bannerSizeStyle());
        syncSize();
        window.addEventListener('resize', syncSize);
        return () => window.removeEventListener('resize', syncSize);
    }, [visible]);

    const dismiss = useCallback(() => {
        markDismissed();
        setVisible(false);
    }, []);

    if (!visible) {
        return null;
    }

    return ReactDOM.createPortal(
        (
            <div
                className={styles.overlay}
                role="dialog"
                aria-modal="true"
                aria-label="Scratch Olympiad 2026"
            >
                <div className={styles.banner} style={sizeStyle}>
                    <button
                        type="button"
                        className={styles.close}
                        aria-label="Close"
                        onClick={dismiss}
                    />
                    <img
                        className={styles.image}
                        src={BANNER_SRC}
                        alt="Приглашаем стать экспертом Scratch Olympiad 2026"
                    />
                    <div className={styles.ctaColumn}>
                        <a
                            className={styles.ctaPrimary}
                            href={LINK_APPLY}
                            aria-label="Подать заявку: robbo.ru/olymp/expert/"
                            {...EXTERNAL_LINK_PROPS}
                        >
                            <span className={styles.ctaPrimaryBtn}>Подать заявку</span>
                            <span className={styles.ctaPrimaryUrl}>robbo.ru/olymp/expert/</span>
                            <span className={styles.ctaCursorArrow} aria-hidden="true">
                                <svg viewBox="0 0 36 40" width="1.75em" height="1.9em" focusable="false">
                                    <path
                                        fill="#fff"
                                        stroke="rgba(10, 40, 80, 0.28)"
                                        strokeWidth="1.1"
                                        d="M7 3v26.5l5.6-5.4 3.3 8.7 3.6-1.4-3.4-8.6H24z"
                                    />
                                    <path
                                        fill="none"
                                        stroke="#fff"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        d="M24.5 5.2l4.8-2.5M27 9.4l5.1.2M25.5 13.6l4.4 2.8"
                                    />
                                </svg>
                            </span>
                        </a>
                        <a
                            className={styles.ctaSecondary}
                            href={LINK_INFO}
                            aria-label="Вся информация о Международной Scratch-Олимпиаде: creativeprogramming.org"
                            {...EXTERNAL_LINK_PROPS}
                        >
                            <span className={styles.ctaSecondaryTitle}>
                                Вся информация о Международной Scratch-Олимпиаде:
                            </span>
                            <span className={styles.ctaSecondaryValueRow}>
                                <span className={styles.ctaSecondaryValue}>https://creativeprogramming.org/</span>
                                <span className={styles.ctaCursorHand} aria-hidden="true">
                                    <svg viewBox="0 0 28 32" width="1.5em" height="1.7em" focusable="false">
                                        <path
                                            fill="#fff"
                                            stroke="rgba(10, 40, 80, 0.28)"
                                            strokeWidth="1"
                                            d="M11 2.5c.9 0 1.6.7 1.6 1.6V14l1.2-.4c.7-.2 1.5.2 1.7.9l.1.4 1.1-.2c.8-.1 1.5.4 1.6 1.2v.3l1 .1c.8 0 1.4.7 1.4 1.5v6.2c0 3.4-2.2 5.6-5.6 5.6H13c-2.6 0-4.2-1-5.4-2.7L4.2 20.3c-.5-.7-.3-1.7.5-2.1.7-.4 1.6-.1 2 .5l1.8 2.5V4.1c0-.9.7-1.6 1.6-1.6z"
                                        />
                                    </svg>
                                </span>
                            </span>
                        </a>
                        <a
                            className={styles.ctaSecondary}
                            href={LINK_MAIL}
                            aria-label="Контакты оргкомитета: scratch@creativeprogramming.org"
                        >
                            <span className={styles.ctaSecondaryTitle}>Контакты оргкомитета:</span>
                            <span className={styles.ctaSecondaryValueRow}>
                                <span className={styles.ctaSecondaryValue}>scratch@creativeprogramming.org</span>
                                <span className={styles.ctaCursorHand} aria-hidden="true">
                                    <svg viewBox="0 0 28 32" width="1.5em" height="1.7em" focusable="false">
                                        <path
                                            fill="#fff"
                                            stroke="rgba(10, 40, 80, 0.28)"
                                            strokeWidth="1"
                                            d="M11 2.5c.9 0 1.6.7 1.6 1.6V14l1.2-.4c.7-.2 1.5.2 1.7.9l.1.4 1.1-.2c.8-.1 1.5.4 1.6 1.2v.3l1 .1c.8 0 1.4.7 1.4 1.5v6.2c0 3.4-2.2 5.6-5.6 5.6H13c-2.6 0-4.2-1-5.4-2.7L4.2 20.3c-.5-.7-.3-1.7.5-2.1.7-.4 1.6-.1 2 .5l1.8 2.5V4.1c0-.9.7-1.6 1.6-1.6z"
                                        />
                                    </svg>
                                </span>
                            </span>
                        </a>
                    </div>
                </div>
            </div>
        ),
        document.body
    );
}

export default OlympiadExpertPromoBanner;
