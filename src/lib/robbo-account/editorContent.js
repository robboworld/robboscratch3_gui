/**
 * Whether to prompt the user to save before leaving the editor.
 * Uses projectChanged (any edit since load/save), not current block count.
 * @param {{authenticated?: boolean, projectChanged?: boolean}} opts
 * @returns {boolean}
 */
export function shouldPromptSaveBeforeLeave ({
    authenticated,
    projectChanged
}) {
    return Boolean(authenticated && projectChanged);
}

/** @deprecated use shouldPromptSaveBeforeLeave */
export function shouldPromptSaveOnLogout (opts) {
    return shouldPromptSaveBeforeLeave(opts);
}
