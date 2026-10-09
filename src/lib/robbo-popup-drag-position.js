import ReactDOM from 'react-dom';
import {getEmptyImage} from 'react-dnd-html5-backend';
import {clampPopupToViewport} from './robbo-popup-position';

/**
 * @typedef {{windowTop: number, windowLeft: number, pointerX: number, pointerY: number,
 *   width: number, height: number}} PopupDragAnchor
 */

/**
 * @param {object} props
 * @param {object} monitor react-dnd monitor
 * @param {object|null} component drag source instance
 * @param {(props: object) => {top: number, left: number}} getWindowPosition
 * @returns {PopupDragAnchor}
 */
export function capturePopupDragAnchor (props, monitor, component, getWindowPosition) {
    const {top, left} = getWindowPosition(props);
    const initialClient = monitor.getInitialClientOffset();
    // Popup size, so a drag or drop keeps it on screen.
    let width = 0;
    let height = 0;
    try {
        const node = component ? ReactDOM.findDOMNode(component) : null;
        if (node && node.getBoundingClientRect) {
            const rect = node.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
        }
    } catch (e) {
        // Unmounted: no clamping by size.
    }
    const anchor = {
        windowTop: top,
        windowLeft: left,
        pointerX: initialClient != null ? initialClient.x : 0,
        pointerY: initialClient != null ? initialClient.y : 0,
        width,
        height
    };
    if (component) {
        component._popupDragAnchor = anchor;
    }
    return anchor;
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {PopupDragAnchor|null|undefined} anchor
 * @returns {{top: number, left: number}|null}
 */
export function resolvePopupPositionFromPointer (clientX, clientY, anchor) {
    if (!anchor) {
        return null;
    }
    return clampPopupToViewport(
        anchor.windowTop + (clientY - anchor.pointerY),
        anchor.windowLeft + (clientX - anchor.pointerX),
        anchor.width || 0,
        anchor.height || 0
    );
}

/**
 * Drop position with the same grab offset as during drag.
 * @param {object} monitor
 * @param {object|null|undefined} item drag item (may include dragAnchor)
 * @returns {{top: number, left: number}|null}
 */
export function resolvePopupDropPosition (monitor, item) {
    const anchor = item && item.dragAnchor;
    const client = monitor.getClientOffset();
    if (anchor && client) {
        return resolvePopupPositionFromPointer(client.x, client.y, anchor);
    }
    const diff = monitor.getDifferenceFromInitialOffset();
    const initialSource = monitor.getInitialSourceClientOffset();
    if (diff && initialSource) {
        return clampPopupToViewport(initialSource.y + diff.y, initialSource.x + diff.x, 0, 0);
    }
    const coords = monitor.getSourceClientOffset();
    if (coords) {
        return clampPopupToViewport(coords.y, coords.x, 0, 0);
    }
    return null;
}

/**
 * @param {object} source react-dnd drag source spec
 * @param {(props: object) => {top: number, left: number}} getWindowPosition
 * @returns {object}
 */
export function wrapPopupDragSource (source, getWindowPosition) {
    const baseBeginDrag = source.beginDrag;
    return {
        ...source,
        beginDrag (props, monitor, component) {
            const baseItem = baseBeginDrag
                ? baseBeginDrag(props, monitor, component)
                : {};
            const dragAnchor = capturePopupDragAnchor(
                props,
                monitor,
                component,
                getWindowPosition
            );
            return Object.assign({}, baseItem, {dragAnchor});
        }
    };
}

/**
 * While dragging, follow the pointer; after drop use stored Redux coords.
 */
export function resolvePopupDragTopLeft (
    storedTop,
    storedLeft,
    isDragging,
    dragFollowTop,
    dragFollowLeft
) {
    if (isDragging && dragFollowTop != null && dragFollowLeft != null) {
        return {
            top: Math.round(dragFollowTop),
            left: Math.round(dragFollowLeft)
        };
    }
    return {
        top: storedTop,
        left: storedLeft
    };
}

export function collectPopupDragSource (connect, monitor) {
    return {
        connectDragSource: connect.dragSource(),
        connectDragPreview: connect.dragPreview(),
        isDragging: monitor.isDragging()
    };
}

export function attachEmptyDragPreview (connectDragPreview) {
    if (connectDragPreview) {
        connectDragPreview(getEmptyImage(), {captureDraggingState: true});
    }
}

export function createPopupDragFollowState () {
    return {
        dragFollowTop: null,
        dragFollowLeft: null
    };
}

export function handlePopupDragFollowLifecycle (component, prevProps, isDraggingNow) {
    const wasDragging = prevProps.isDragging;
    if (!wasDragging && isDraggingNow) {
        startPopupDragFollow(component);
    } else if (wasDragging && !isDraggingNow) {
        stopPopupDragFollow(component);
        component._popupDragAnchor = null;
        if (component.state.dragFollowTop != null || component.state.dragFollowLeft != null) {
            component.setState({dragFollowTop: null, dragFollowLeft: null});
        }
    }
}

export function startPopupDragFollow (component) {
    stopPopupDragFollow(component);
    const handler = e => {
        e.preventDefault();
        const pos = resolvePopupPositionFromPointer(
            e.clientX,
            e.clientY,
            component._popupDragAnchor
        );
        if (!pos) {
            return;
        }
        component.setState({
            dragFollowTop: pos.top,
            dragFollowLeft: pos.left
        });
    };
    component._popupDragFollowHandler = handler;
    window.addEventListener('dragover', handler);
}

export function stopPopupDragFollow (component) {
    if (component._popupDragFollowHandler) {
        window.removeEventListener('dragover', component._popupDragFollowHandler);
        component._popupDragFollowHandler = null;
    }
}
