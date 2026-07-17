import React, {useCallback, useEffect, useRef, useState} from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import styles from './OlympiadExpertPromoBanner.css';
import {node_process} from '../lib/platform';

const STORAGE_KEY = 'rs3_promo_olympiad_expert_2026_dismissed';
const BANNER_SRC = './static/promo/olympiad-expert-2026.jpg';

const LINK_APPLY = 'https://robbo.ru/olymp/expert/';
const LINK_INFO = 'https://creativeprogramming.org/';
const LINK_MAIL = 'mailto:scratch@creativeprogramming.org';

const EXTERNAL_LINK_PROPS = {
    target: '_blank',
    rel: 'noopener noreferrer'
};

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
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function markDismissed () {
    try {
        window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
        // ignore quota / private mode
    }
}

/**
 * OS display scale for "1 bitmap px ≈ 1 physical px".
 * Chrome on Linux with 150% fractional scaling often reports devicePixelRatio=2
 * while CSS pixels follow ~1.5× (2560 physical → ~1707 CSS).
 */
function getDisplayScale () {
    if (typeof window === 'undefined') {
        return 1;
    }
    const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const isLinux = typeof navigator !== 'undefined' && (
        /Linux/i.test(navigator.userAgent || '') ||
        /Linux/i.test(navigator.platform || '')
    );
    if (isLinux && dpr === 2) {
        return 1.5;
    }
    return dpr;
}

/** CSS size: natural / OS scale, then shrink to fit viewport (never upscale). */
function cssSizeForDisplay (naturalWidth, naturalHeight) {
    const scale = getDisplayScale();
    let width = naturalWidth / scale;
    let height = naturalHeight / scale;
    if (typeof window !== 'undefined') {
        const maxWidth = Math.max(0, window.innerWidth * 0.92);
        const maxHeight = Math.max(0, window.innerHeight * 0.92);
        const fit = Math.min(
            1,
            maxWidth > 0 ? maxWidth / width : 1,
            maxHeight > 0 ? maxHeight / height : 1
        );
        width *= fit;
        height *= fit;
    }
    return {width, height};
}

function OlympiadExpertPromoBanner () {
    const [visible, setVisible] = useState(false);
    const [imgStyle, setImgStyle] = useState(null);
    const imgRef = useRef(null);

    useEffect(() => {
        if (!isWebPromoHost()) {
            return;
        }
        if (wasDismissed()) {
            return;
        }
        setVisible(true);
    }, []);

    const applyImageSize = useCallback(img => {
        if (!img || !img.naturalWidth) {
            return;
        }
        const size = cssSizeForDisplay(img.naturalWidth, img.naturalHeight);
        setImgStyle({
            width: `${size.width}px`,
            height: `${size.height}px`
        });
    }, []);

    const setImageRef = useCallback(node => {
        imgRef.current = node;
        if (node && node.complete) {
            applyImageSize(node);
        }
    }, [applyImageSize]);

    const onImageLoad = useCallback(event => {
        applyImageSize(event.currentTarget);
    }, [applyImageSize]);

    const dismiss = useCallback(() => {
        markDismissed();
        setVisible(false);
    }, []);

    const onOverlayClick = useCallback(event => {
        if (event.target === event.currentTarget) {
            dismiss();
        }
    }, [dismiss]);

    const onLinkClick = useCallback(() => {
        markDismissed();
        setVisible(false);
    }, []);

    useEffect(() => {
        if (!visible) {
            return undefined;
        }
        applyImageSize(imgRef.current);
        const onKeyDown = event => {
            if (event.key === 'Escape') {
                dismiss();
            }
        };
        const onResize = () => applyImageSize(imgRef.current);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onResize);
        };
    }, [visible, dismiss, applyImageSize]);

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
                onClick={onOverlayClick}
            >
                <div className={styles.banner}>
                    <button
                        type="button"
                        className={styles.close}
                        aria-label="Close"
                        onClick={dismiss}
                    >
                        ×
                    </button>
                    <img
                        ref={setImageRef}
                        className={styles.image}
                        src={BANNER_SRC}
                        alt="Приглашаем стать экспертом Scratch Olympiad 2026"
                        style={imgStyle || undefined}
                        onLoad={onImageLoad}
                    />
                    <a
                        className={classNames(styles.hotspot, styles.hotspotApply)}
                        href={LINK_APPLY}
                        aria-label="Подать заявку: robbo.ru/olymp/expert/"
                        onClick={onLinkClick}
                        {...EXTERNAL_LINK_PROPS}
                    >
                        <span className={styles.srOnly}>{LINK_APPLY}</span>
                    </a>
                    <a
                        className={classNames(styles.hotspot, styles.hotspotInfo)}
                        href={LINK_INFO}
                        aria-label="Информация об олимпиаде: creativeprogramming.org"
                        onClick={onLinkClick}
                        {...EXTERNAL_LINK_PROPS}
                    >
                        <span className={styles.srOnly}>{LINK_INFO}</span>
                    </a>
                    <a
                        className={classNames(styles.hotspot, styles.hotspotMail)}
                        href={LINK_MAIL}
                        aria-label="Контакты: scratch@creativeprogramming.org"
                        onClick={onLinkClick}
                    >
                        <span className={styles.srOnly}>scratch@creativeprogramming.org</span>
                    </a>
                </div>
            </div>
        ),
        document.body
    );
}

export default OlympiadExpertPromoBanner;
