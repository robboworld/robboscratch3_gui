/**
 * Android WebView applies CSS zoom on <html> to fit min-width layout on phones.
 * Touch clientX/Y and getBoundingClientRect() are in viewport (visual) px, but
 * style.left/top/transform on descendants use layout px (visual / zoom).
 */

import {isRobboAndroidPhoneContext} from './platform';

export const getPageZoom = () => {
    if (typeof window === 'undefined') return 1;
    if (typeof window.__ROBBO_PAGE_ZOOM__ === 'number' &&
        window.__ROBBO_PAGE_ZOOM__ > 0 &&
        window.__ROBBO_PAGE_ZOOM__ < 1) {
        return window.__ROBBO_PAGE_ZOOM__;
    }
    const inline = document.documentElement.style.zoom;
    if (inline && inline !== '100%') {
        const parsed = parseFloat(inline);
        if (Number.isFinite(parsed)) return parsed / 100;
    }
    return 1;
};

/** CSS page-zoom compensation: Android phone with layout zoom below 100% only. */
export const needsPageZoomCoordCompensation = () =>
    isRobboAndroidPhoneContext() && getPageZoom() < 1;

export const viewportToLayoutCoord = value => {
    const zoom = getPageZoom();
    return needsPageZoomCoordCompensation() ? value / zoom : value;
};

export const layoutStagePointer = (localX, localY) => {
    if (!needsPageZoomCoordCompensation()) {
        return {x: localX, y: localY};
    }
    const zoom = getPageZoom();
    return {
        x: localX / zoom,
        y: localY / zoom
    };
};

/** Blockly passes visual origin + layout field size; return layout drop-down anchor. */
export const dropDownAnchorFromVisualRect = (visualLeft, visualTop, layoutWidth, layoutHeight) => ({
    primaryX: viewportToLayoutCoord(visualLeft) + layoutWidth / 2,
    primaryY: viewportToLayoutCoord(visualTop) + layoutHeight,
    secondaryX: viewportToLayoutCoord(visualLeft) + layoutWidth / 2,
    secondaryY: viewportToLayoutCoord(visualTop)
});

const withLayoutBoundsGetBCR = (boundsElement, run) => {
    if (!needsPageZoomCoordCompensation() || !boundsElement) {
        return run();
    }
    const zoom = getPageZoom();
    const origGetBCR = boundsElement.getBoundingClientRect.bind(boundsElement);
    boundsElement.getBoundingClientRect = () => {
        const rect = origGetBCR();
        return {
            left: rect.left / zoom,
            top: rect.top / zoom,
            right: rect.right / zoom,
            bottom: rect.bottom / zoom,
            width: rect.width / zoom,
            height: rect.height / zoom,
            x: rect.x / zoom,
            y: rect.y / zoom
        };
    };
    try {
        return run();
    } finally {
        boundsElement.getBoundingClientRect = origGetBCR;
    }
};

const resolveDropDownAnchor = owner => {
    if (!owner || !owner.sourceBlock_) return null;
    const block = owner.sourceBlock_;
    const scale = block.workspace.scale;
    let rect;
    let layoutW;
    let layoutH;

    if (owner.fieldGroup_) {
        rect = owner.fieldGroup_.getBoundingClientRect();
        layoutW = owner.size_.width * scale;
        layoutH = owner.size_.height * scale;
    } else {
        const svgRoot = block.getSvgRoot && block.getSvgRoot();
        if (!svgRoot) return null;
        rect = svgRoot.getBoundingClientRect();
        const hw = block.getHeightWidth();
        layoutW = hw.width * scale;
        layoutH = hw.height * scale;
    }

    return dropDownAnchorFromVisualRect(rect.left, rect.top, layoutW, layoutH);
};

const patchDropDownDiv = ScratchBlocks => {
    const DD = ScratchBlocks.DropDownDiv;
    if (!DD || DD.__rs3PageZoomPatched) return;

    const origGetMetrics = DD.getPositionMetrics.bind(DD);
    DD.getPositionMetrics = (primaryX, primaryY, secondaryX, secondaryY) => withLayoutBoundsGetBCR(
        DD.boundsElement_,
        () => origGetMetrics(primaryX, primaryY, secondaryX, secondaryY)
    );

    const origShow = DD.show.bind(DD);
    DD.show = (owner, primaryX, primaryY, secondaryX, secondaryY, opt_onHide) => {
        const anchor = needsPageZoomCoordCompensation() ? resolveDropDownAnchor(owner) : null;
        if (anchor) {
            primaryX = anchor.primaryX;
            primaryY = anchor.primaryY;
            secondaryX = anchor.secondaryX;
            secondaryY = anchor.secondaryY;
        }
        return origShow(owner, primaryX, primaryY, secondaryX, secondaryY, opt_onHide);
    };

    if (DD.showPositionedByBlock) {
        const origShowByBlock = DD.showPositionedByBlock.bind(DD);
        DD.showPositionedByBlock = (owner, block, opt_onHide, optSecondaryYOffset) => {
            if (!needsPageZoomCoordCompensation()) {
                return origShowByBlock(owner, block, opt_onHide, optSecondaryYOffset);
            }
            const scale = block.workspace.scale;
            const layoutW = block.width * scale;
            const layoutH = block.height * scale;
            const rect = block.getSvgRoot().getBoundingClientRect();
            const anchor = dropDownAnchorFromVisualRect(rect.left, rect.top, layoutW, layoutH);
            DD.setBoundsElement(block.workspace.getParentSvg().parentNode);
            return DD.show(
                owner,
                anchor.primaryX,
                anchor.primaryY,
                anchor.secondaryX,
                anchor.secondaryY + (optSecondaryYOffset || 0),
                opt_onHide
            );
        };
    }

    DD.__rs3PageZoomPatched = true;
};

const patchWidgetDiv = ScratchBlocks => {
    const WD = ScratchBlocks.WidgetDiv;
    if (!WD || WD.__rs3PageZoomPatched) return;

    const origPositionInternal = WD.positionInternal_;
    WD.positionInternal_ = (x, y, height) => origPositionInternal(
        viewportToLayoutCoord(x),
        viewportToLayoutCoord(y),
        viewportToLayoutCoord(height)
    );

    WD.__rs3PageZoomPatched = true;
};

const patchFieldTextInputResize = ScratchBlocks => {
    const proto = ScratchBlocks.FieldTextInput && ScratchBlocks.FieldTextInput.prototype;
    if (!proto || proto.__rs3PageZoomPatched) return;

    const fieldProto = ScratchBlocks.Field.prototype;
    const origGetAbsoluteXY = fieldProto.getAbsoluteXY_;
    const origResizeEditor = proto.resizeEditor_;

    proto.resizeEditor_ = function () {
        if (!needsPageZoomCoordCompensation()) {
            origResizeEditor.call(this);
            return;
        }
        fieldProto.getAbsoluteXY_ = function () {
            const xy = origGetAbsoluteXY.call(this);
            xy.x = viewportToLayoutCoord(xy.x);
            xy.y = viewportToLayoutCoord(xy.y);
            return xy;
        };
        try {
            origResizeEditor.call(this);
        } finally {
            fieldProto.getAbsoluteXY_ = origGetAbsoluteXY;
        }
    };

    proto.__rs3PageZoomPatched = true;
};

const patchGestureDragDelta = ScratchBlocks => {
    const proto = ScratchBlocks.Gesture && ScratchBlocks.Gesture.prototype;
    if (!proto || proto.__rs3PageZoomPatched) return;

    const origUpdateDragDelta = proto.updateDragDelta_;
    proto.updateDragDelta_ = function (currentXY) {
        const result = origUpdateDragDelta.call(this, currentXY);
        if (needsPageZoomCoordCompensation()) {
            this.currentDragDeltaXY_.x = viewportToLayoutCoord(this.currentDragDeltaXY_.x);
            this.currentDragDeltaXY_.y = viewportToLayoutCoord(this.currentDragDeltaXY_.y);
        }
        return result;
    };

    proto.__rs3PageZoomPatched = true;
};

/**
 * Patch Blockly overlays and drag deltas when page CSS zoom is active (Android phone).
 * @param {object} ScratchBlocks Blockly / scratch-blocks namespace from GUI.
 */
export const installPageZoomCoordPatches = ScratchBlocks => {
    if (!ScratchBlocks || !isRobboAndroidPhoneContext()) return;
    patchDropDownDiv(ScratchBlocks);
    patchWidgetDiv(ScratchBlocks);
    patchFieldTextInputResize(ScratchBlocks);
    patchGestureDragDelta(ScratchBlocks);
};

let paperDomElementPatched = false;
let paperViewCoordsPatched = false;

const findPaintCanvasContainer = canvas => {
    if (!canvas || !canvas.parentElement) return null;
    return canvas.parentElement;
};

const measurePaintContainerSize = container => {
    if (!container) return null;
    const w = Math.round(container.clientWidth);
    const h = Math.round(container.clientHeight);
    if (w <= 0 || h <= 0) return null;
    return {w, h};
};

const readPaintLayoutSize = canvas => {
    const container = canvas.__rs3PaintContainer || findPaintCanvasContainer(canvas);
    const fromContainer = measurePaintContainerSize(container);
    if (fromContainer) return fromContainer;
    if (canvas.__rs3PaintBaseline) return canvas.__rs3PaintBaseline;
    const w = Math.round(canvas.offsetWidth);
    const h = Math.round(canvas.offsetHeight);
    if (w <= 0 || h <= 0) return null;
    return {w, h};
};

const patchPaperDomElementGetSize = paper => {
    if (!paper || !paper.DomElement || paperDomElementPatched) return;
    const origGetSize = paper.DomElement.getSize;
    paper.DomElement.getSize = element => {
        if (!needsPageZoomCoordCompensation()) {
            return origGetSize.call(paper.DomElement, element);
        }
        if (element && element.tagName === 'CANVAS') {
            const size = readPaintLayoutSize(element);
            if (size) return new paper.Size(size.w, size.h);
        }
        return origGetSize.call(paper.DomElement, element);
    };
    paperDomElementPatched = true;
};

const patchPaperViewCoords = paper => {
    if (!paper || !paper.View || paperViewCoordsPatched) return;
    const origViewToProject = paper.View.prototype.viewToProject;
    paper.View.prototype.viewToProject = function (point, ...rest) {
        if (needsPageZoomCoordCompensation() && point) {
            const zoom = getPageZoom();
            point = new paper.Point(point.x / zoom, point.y / zoom);
        }
        return origViewToProject.call(this, point, ...rest);
    };
    paperViewCoordsPatched = true;
};

const patchPaintCanvasClientDimensions = canvas => {
    if (!canvas || canvas.__rs3PaintClientPatched || !needsPageZoomCoordCompensation()) return false;

    const container = findPaintCanvasContainer(canvas);
    const size = readPaintLayoutSize(canvas);
    if (!size) return false;

    canvas.__rs3PaintContainer = container;
    canvas.__rs3PaintBaseline = size;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.margin = '0';
    canvas.style.left = '0';
    canvas.style.top = '0';

    Object.defineProperty(canvas, 'clientWidth', {
        configurable: true,
        get () {
            const live = readPaintLayoutSize(this);
            return live ? live.w : this.__rs3PaintBaseline.w;
        }
    });
    Object.defineProperty(canvas, 'clientHeight', {
        configurable: true,
        get () {
            const live = readPaintLayoutSize(this);
            return live ? live.h : this.__rs3PaintBaseline.h;
        }
    });
    canvas.__rs3PaintClientPatched = true;
    return true;
};

const recalibratePaintViewOnce = paper => {
    const canvas = paper && paper.view && paper.view.element;
    if (!canvas || canvas.__rs3PaintViewSized) return false;
    if (!patchPaintCanvasClientDimensions(canvas)) return false;

    const size = readPaintLayoutSize(canvas);
    if (!size) return false;

    paper.view.setViewSize(new paper.Size(size.w, size.h));
    canvas.__rs3PaintViewSized = true;
    centerPaintEditorView(paper);
    return true;
};

let paintViewHelperModule;

const getPaintViewHelper = () => {
    if (paintViewHelperModule === undefined) {
        try {
            paintViewHelperModule = require('scratch-paint/src/helper/view');
        } catch (e) {
            paintViewHelperModule = null;
        }
    }
    return paintViewHelperModule;
};

/** Same as scratch-paint zoom reset (=) button. */
export const centerPaintEditorView = paper => {
    if (!paper || !paper.view) return false;
    const helper = getPaintViewHelper();
    if (helper && typeof helper.resetZoom === 'function') {
        helper.resetZoom();
        return true;
    }
    paper.view.zoom = 0.5;
    paper.view.center = new paper.Point(480, 360);
    return false;
};

const applyPaintContainerResize = paper => {
    const canvas = paper && paper.view && paper.view.element;
    if (!canvas || !needsPageZoomCoordCompensation()) return false;
    const size = readPaintLayoutSize(canvas);
    if (!size) return false;

    const container = canvas.__rs3PaintContainer || findPaintCanvasContainer(canvas);
    const sizeKey = `${size.w}x${size.h}`;
    if (container && container.__rs3PaintLastResizeKey === sizeKey) {
        return true;
    }
    if (container) {
        container.__rs3PaintLastResizeKey = sizeKey;
    }

    const viewSize = paper.view.viewSize;
    if (!viewSize ||
        Math.round(viewSize.width) !== size.w ||
        Math.round(viewSize.height) !== size.h) {
        paper.view.setViewSize(new paper.Size(size.w, size.h));
    }
    return true;
};

let paintTouchUtilsPatched = false;

const patchPaintTouchUtils = () => {
    if (paintTouchUtilsPatched || !needsPageZoomCoordCompensation()) return;
    try {
        const touchUtils = require('scratch-paint/src/lib/touch-utils');
        const origGetEventXY = touchUtils.getEventXY;
        if (!origGetEventXY || touchUtils.__rs3PageZoomPatched) return;
        touchUtils.getEventXY = e => {
            const xy = origGetEventXY(e);
            if (!needsPageZoomCoordCompensation()) return xy;
            return {
                x: viewportToLayoutCoord(xy.x),
                y: viewportToLayoutCoord(xy.y)
            };
        };
        touchUtils.__rs3PageZoomPatched = true;
        paintTouchUtilsPatched = true;
    } catch (e) {
        // scratch-paint not available in this bundle layout
    }
};

const disconnectPaintResizeObserver = container => {
    if (!container || !container.__rs3PaintResizeObserver) return;
    container.__rs3PaintResizeObserver.disconnect();
    delete container.__rs3PaintResizeObserved;
    delete container.__rs3PaintResizeObserver;
    delete container.__rs3PaintLastResizeKey;
};

const setupPaintResizeObserver = (canvas, paper) => {
    const container = canvas.__rs3PaintContainer || findPaintCanvasContainer(canvas);
    if (!container || typeof ResizeObserver === 'undefined') return;

    disconnectPaintResizeObserver(container);

    let resizeTimer;
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            applyPaintContainerResize(paper);
        }, 150);
    });
    observer.observe(container);
    container.__rs3PaintResizeObserved = true;
    container.__rs3PaintResizeObserver = observer;
};

export const teardownPaintEditorPageZoomPatches = root => {
    if (!root) return;
    const canvas = root.querySelector('canvas');
    if (!canvas) return;
    const container = canvas.__rs3PaintContainer || findPaintCanvasContainer(canvas);
    disconnectPaintResizeObserver(container);
};

/**
 * Align scratch-paint paper.js view with canvas size under page CSS zoom.
 * Applies once per canvas — repeated resize/setViewSize caused shrinking loop.
 * @param {Element|null} root Paint editor container.
 * @param {string} [imageId] Current costume id — re-patch when it changes.
 * @returns {boolean} True when patch applied (or was already applied).
 */
export const installPaintEditorPageZoomPatches = (root, imageId) => {
    if (!needsPageZoomCoordCompensation() || !root) return false;

    const canvas = root.querySelector('canvas');
    if (!canvas) return false;
    if (imageId && canvas.__rs3PaintZoomInstallDone === imageId) return true;

    if (imageId && canvas.__rs3PaintZoomInstallDone && canvas.__rs3PaintZoomInstallDone !== imageId) {
        canvas.__rs3PaintClientPatched = false;
        canvas.__rs3PaintViewSized = false;
        delete canvas.__rs3PaintBaseline;
    }

    let paper;
    try {
        paper = require('@scratch/paper');
    } catch (e) {
        return false;
    }

    patchPaperDomElementGetSize(paper);
    patchPaperViewCoords(paper);
    patchPaintTouchUtils();

    if (!paper.view || paper.view.element !== canvas) {
        return false;
    }

    const sized = recalibratePaintViewOnce(paper);
    if (!sized) return false;

    setupPaintResizeObserver(canvas, paper);
    canvas.__rs3PaintZoomInstallDone = imageId || true;

    return true;
};
