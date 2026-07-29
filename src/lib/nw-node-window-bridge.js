/**
 * Bridge NW.js Node modules to window.__node_*__ for GUI (platform.js, licensing).
 * DCA uses the same field names via platforms/desktop/nw-desktop-node.js.
 */
export function bridgeNwNodeModulesToWindow (modules) {
    if (typeof window === 'undefined') return;
    if (window.__ROBBO_NW_NODE_BRIDGED__) return;
    window.__ROBBO_NW_NODE_BRIDGED__ = true;
    if (modules.process) window.__node_process__ = modules.process;
    if (modules.os) window.__node_os__ = modules.os;
    if (modules.path) window.__node_path__ = modules.path;
    if (modules.child_process) window.__node_child_process__ = modules.child_process;
}
