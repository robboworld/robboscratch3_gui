import log from '../../lib/log';
import dataURItoBlob from '../../lib/data-uri-to-blob';
import queryString from 'query-string';
import {
    getSessionStatus,
    signIn,
    listProjectPages,
    createProjectPage,
    getProjectPage,
    downloadProjectSb3,
    updateProjectPage,
    uploadProjectSb3,
    uploadProjectPreview,
    clearAccessTokenMemory
} from '../../lib/robbo-account/robboAccountClient';
import {
    bffLogoutClearUrl,
    idpLogoutUrl,
    lmsRegisterUrl,
    lmsSharesEditorSite,
    oidcLogoutUrl,
    oidcStartUrl,
    canonicalizeLoopbackEditorHost,
    CLOUD_PROJECT_URL_PARAMS,
    resolveEditorLogoutReturnTo
} from '../../lib/robbo-account/robboAccountConfig';
import {
    ROBBO_ACCOUNT_SESSION_START,
    ROBBO_ACCOUNT_SESSION_SUCCESS,
    ROBBO_ACCOUNT_SESSION_FAILURE,
    ROBBO_ACCOUNT_SET_CLOUD_PROJECT,
    ROBBO_ACCOUNT_SAVE_START,
    ROBBO_ACCOUNT_SAVE_SUCCESS,
    ROBBO_ACCOUNT_SAVE_FAILURE,
    ROBBO_ACCOUNT_CLEAR_SAVE_STATUS,
    ROBBO_ACCOUNT_TITLE_SAVE_SUCCESS,
    ROBBO_ACCOUNT_SIGN_OUT,
    ROBBO_ACCOUNT_SET_CLOUD_PROJECT_ACCESS_BLOCKED
} from '../reducers/robboAccount';
import {setProjectTitle} from '../../reducers/project-title';
import {setProjectUnchanged} from '../../reducers/project-changed';
import {
    LoadingState,
    onLoadedProject,
    requestProjectUpload
} from '../../reducers/project-state';
import {openLoadingProject, closeLoadingProject} from '../../reducers/modals';
import {removeSnapshot} from '../../lib/project-session-store';
import storage from '../../lib/storage';

const UUID_RE = /^[0-9a-fA-F-]{36}$/;
// The page title from index.html: a cloud project replaces it with its own name.
const DEFAULT_DOCUMENT_TITLE = typeof document === 'undefined' ? '' : document.title;

function parseUrlProjectPageId () {
    if (typeof window === 'undefined') {
        return '';
    }
    const q = queryString.parse(window.location.search);
    const id = (q.projectPageId || q.projectRef || '').trim();
    if (!id || !UUID_RE.test(id)) {
        return '';
    }
    return id;
}

function displayNameFromStatus (status) {
    if (!status) {
        return '';
    }
    const email = (status.email || '').trim();
    if (email) {
        const at = email.indexOf('@');
        return at > 0 ? email.slice(0, at) : email;
    }
    return (status.sub || status.edx_user_id || '').trim();
}

function lmsPasswordFallbackFromStatus (status) {
    if (status && typeof status.lms_password_fallback === 'boolean') {
        return status.lms_password_fallback;
    }
    return undefined;
}

export function setCloudProjectPageId (cloudProjectPageId) {
    return {
        type: ROBBO_ACCOUNT_SET_CLOUD_PROJECT,
        payload: {cloudProjectPageId: cloudProjectPageId || ''}
    };
}

export function setCloudProjectAccessBlocked (blocked) {
    return {
        type: ROBBO_ACCOUNT_SET_CLOUD_PROJECT_ACCESS_BLOCKED,
        payload: {blocked: !!blocked}
    };
}

export function clearSaveStatus () {
    return {type: ROBBO_ACCOUNT_CLEAR_SAVE_STATUS};
}

function showTitleChangedStatus (dispatch) {
    dispatch({type: ROBBO_ACCOUNT_TITLE_SAVE_SUCCESS});
    setTimeout(() => {
        dispatch(clearSaveStatus());
    }, 2500);
}

function projectPageIdFromPage (page) {
    return page && (page.projectPageId || page.projectPageID || page.id || '');
}

function setProjectPageIdInUrl (projectPageId) {
    if (typeof window === 'undefined' || !window.history || !window.history.replaceState || !projectPageId) {
        return;
    }
    const params = Object.assign(
        {},
        queryString.parse(window.location.search),
        {projectPageId}
    );
    const search = queryString.stringify(params);
    const hash = window.location.hash || '';
    window.history.replaceState(null, '', `${window.location.pathname}?${search}${hash}`);
}

/**
 * Load a cloud project into the VM (metadata + optional .sb3).
 * @param {string} projectPageId
 * @param {{updateUrl?: boolean}} [options]
 */
export function loadCloudProjectIntoEditorThunk (projectPageId, options = {}) {
    const updateUrl = !(options && options.updateUrl === false);
    return function (dispatch, getState) {
        const state = getState();
        const vm = state.scratchGui.vm;
        if (!vm || !projectPageId) {
            return Promise.resolve('');
        }

        dispatch(setCloudProjectPageId(projectPageId));
        if (updateUrl) {
            setProjectPageIdInUrl(projectPageId);
        }
        dispatch(openLoadingProject());

        const metaPromise = getProjectPage(projectPageId)
            .then(resp => {
                const page = resp && resp.projectPage;
                return (page && page.title) || '';
            })
            .catch(err => {
                log.warn('cloud project meta load failed', err);
                return '';
            });

        const sb3Promise = downloadProjectSb3(projectPageId)
            .then(buffer => ({ok: true, buffer}))
            .catch(err => {
                if (err && (err.status === 404 ||
                    (err.message && String(err.message).indexOf('not found') >= 0) ||
                    (err.errorCode && String(err.errorCode).indexOf('project file') >= 0))) {
                    return {ok: false, buffer: null};
                }
                throw err;
            });

        return Promise.all([sb3Promise, metaPromise])
            .then(([sb3, title]) => {
                if (title) {
                    dispatch(setProjectTitle(title));
                    if (typeof document !== 'undefined') {
                        document.title = title;
                    }
                }
                if (!sb3.ok || !sb3.buffer) {
                    dispatch(setProjectUnchanged());
                    dispatch(closeLoadingProject());
                    return projectPageId;
                }

                const loadingState = getState().scratchGui.projectState.loadingState;
                const uploadAction = requestProjectUpload(loadingState);
                if (!uploadAction) {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            dispatch(loadCloudProjectIntoEditorThunk(projectPageId, options)).then(resolve);
                        }, 150);
                    });
                }
                dispatch(uploadAction);
                return vm.loadProject(sb3.buffer).then(() => {
                    dispatch(setProjectUnchanged());
                    // canSave false: playground must not auto-push to Scratch servers.
                    dispatch(onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, false, true));
                    dispatch(closeLoadingProject());
                    return projectPageId;
                });
            })
            .catch(err => {
                log.warn('load cloud project into editor failed', err);
                dispatch(closeLoadingProject());
                return '';
            });
    };
}

/**
 * After auth: bind id from Redux/URL, or list cloud projects — create empty draft
 * when none exist, otherwise open the most recently saved project.
 */
export function ensureCloudProjectPageThunk () {
    return function (dispatch, getState) {
        const account = getState().scratchGui.robboAccount || {};
        if (account.cloudProjectPageId) {
            return Promise.resolve(account.cloudProjectPageId);
        }
        const urlId = parseUrlProjectPageId();
        if (urlId) {
            dispatch(setCloudProjectPageId(urlId));
            return Promise.resolve(urlId);
        }
        if (account.sessionStatus !== 'authenticated') {
            return Promise.resolve('');
        }
        return listProjectPages()
            .then(resp => {
                const pages = (resp && resp.projectPages) || [];
                if (pages.length > 0) {
                    const id = projectPageIdFromPage(pages[0]);
                    if (!id) {
                        throw new Error('list_project_no_id');
                    }
                    return dispatch(loadCloudProjectIntoEditorThunk(id, {updateUrl: true}));
                }
                const locale = (getState().scratchGui.locales || {}).locale || 'ru';
                return createProjectPage(locale).then(createResp => {
                    const page = createResp && createResp.projectPage;
                    const id = projectPageIdFromPage(page);
                    if (!id) {
                        throw new Error('create_project_no_id');
                    }
                    dispatch(setCloudProjectPageId(id));
                    const title = (page && page.title) || '';
                    if (title) {
                        dispatch(setProjectTitle(title));
                        if (typeof document !== 'undefined') {
                            document.title = title;
                        }
                    }
                    dispatch(setProjectUnchanged());
                    return id;
                });
            })
            .catch(err => {
                log.warn('ensure cloud project failed', err);
                return '';
            });
    };
}

function clearProjectPageIdFromUrl () {
    if (typeof window === 'undefined' || !window.history || !window.history.replaceState) {
        return;
    }
    const params = queryString.parse(window.location.search);
    CLOUD_PROJECT_URL_PARAMS.forEach(name => {
        delete params[name];
    });
    const search = queryString.stringify(params);
    const hash = window.location.hash || '';
    const qs = search ? `?${search}` : '';
    window.history.replaceState(null, '', `${window.location.pathname}${qs}${hash}`);
}

/**
 * Reset the editor to the bundled default project and drop local autosave.
 * @returns {function} thunk → Promise<void>
 */
export function resetEditorToDefaultThunk () {
    return function (dispatch, getState) {
        const vm = getState().scratchGui.vm;
        dispatch(setCloudProjectPageId(''));
        clearProjectPageIdFromUrl();
        if (typeof document !== 'undefined' && DEFAULT_DOCUMENT_TITLE) {
            document.title = DEFAULT_DOCUMENT_TITLE;
        }
        return removeSnapshot()
            .then(() => storage.load(storage.AssetType.Project, 0, storage.DataFormat.JSON))
            .then(projectAsset => {
                if (!vm || !projectAsset || !projectAsset.data) {
                    dispatch(setProjectUnchanged());
                    return undefined;
                }
                dispatch(setProjectTitle(''));
                const loadPromise = vm.loadProject(projectAsset.data);
                if (!loadPromise || typeof loadPromise.then !== 'function') {
                    dispatch(setProjectUnchanged());
                    return undefined;
                }
                return loadPromise
                    .then(() => {
                        dispatch(setProjectUnchanged());
                    })
                    .catch(err => {
                        log.warn('load default project failed', err);
                        dispatch(setProjectUnchanged());
                    });
            })
            .catch(err => {
                log.warn('reset editor to default failed', err);
                dispatch(setProjectUnchanged());
            })
            .then(() => undefined);
    };
}

let checkSessionInFlight = null;

export function checkSessionThunk (options) {
    return function (dispatch, getState) {
        if (canonicalizeLoopbackEditorHost()) {
            return Promise.resolve();
        }
        const force = !!(options && options.force);
        if (!force && checkSessionInFlight) {
            return checkSessionInFlight;
        }
        const sessionStatus = (getState().scratchGui.robboAccount || {}).sessionStatus;
        // MenuBar and the cloud loader both mount a session check. A second
        // SESSION_START after SUCCESS briefly goes loading → authenticated and
        // retriggers cloud load (editor → spinner → editor).
        if (!force && sessionStatus === 'authenticated') {
            return Promise.resolve();
        }
        if (sessionStatus !== 'loading') {
            dispatch({type: ROBBO_ACCOUNT_SESSION_START});
        }
        const request = getSessionStatus()
            .then(status => {
                const lmsPasswordFallback = lmsPasswordFallbackFromStatus(status);
                if (status && status.authenticated) {
                    dispatch({
                        type: ROBBO_ACCOUNT_SESSION_SUCCESS,
                        payload: {
                            user: {
                                email: status.email || '',
                                edxUserId: status.edx_user_id || '',
                                sub: status.sub || '',
                                role: status.role || 0,
                                displayName: displayNameFromStatus(status)
                            },
                            lmsPasswordFallback: typeof lmsPasswordFallback === 'boolean' ?
                                lmsPasswordFallback : undefined
                        }
                    });
                    return dispatch(ensureCloudProjectPageThunk()).then(() => status);
                }
                dispatch({
                    type: ROBBO_ACCOUNT_SESSION_FAILURE,
                    payload: {
                        anonymous: true,
                        lmsPasswordFallback: typeof lmsPasswordFallback === 'boolean' ?
                            lmsPasswordFallback : undefined
                    }
                });
                dispatch(setProjectTitle(''));
                return status;
            })
            .catch(err => {
                log.warn('robbo account session check failed', err);
                dispatch({
                    type: ROBBO_ACCOUNT_SESSION_FAILURE,
                    payload: {anonymous: true, message: err && err.message}
                });
                dispatch(setProjectTitle(''));
            })
            .then(result => {
                if (checkSessionInFlight === request) {
                    checkSessionInFlight = null;
                }
                return result;
            }, err => {
                if (checkSessionInFlight === request) {
                    checkSessionInFlight = null;
                }
                throw err;
            });
        checkSessionInFlight = request;
        return request;
    };
}

/**
 * Capture stage snapshot the same way as project-saver-hoc storeProjectThumbnail.
 * @param {object} vm
 * @returns {Promise<Blob|null>}
 */
function captureStageThumbnail (vm) {
    return new Promise(resolve => {
        try {
            if (!vm || !vm.renderer || typeof vm.renderer.requestSnapshot !== 'function') {
                resolve(null);
                return;
            }
            vm.postIOData('video', {forceTransparentPreview: true});
            vm.renderer.requestSnapshot(dataURI => {
                try {
                    vm.postIOData('video', {forceTransparentPreview: false});
                } catch (e) { /* ignore */ }
                try {
                    resolve(dataURItoBlob(dataURI));
                } catch (e) {
                    resolve(null);
                }
            });
            vm.renderer.draw();
        } catch (e) {
            log.warn('thumbnail capture failed', e);
            resolve(null);
        }
    });
}

/**
 * @param {{asCopy?: boolean}} [options]
 */
export function saveToCloudThunk (options) {
    const asCopy = !!(options && options.asCopy);
    return function (dispatch, getState) {
        const state = getState();
        const account = state.scratchGui.robboAccount || {};
        const vm = state.scratchGui.vm;
        const projectTitle = state.scratchGui.projectTitle || '';
        if (!vm || typeof vm.saveProjectSb3 !== 'function') {
            dispatch({
                type: ROBBO_ACCOUNT_SAVE_FAILURE,
                payload: {message: 'vm_unavailable'}
            });
            return Promise.resolve(false);
        }
        if (account.sessionStatus !== 'authenticated') {
            dispatch({
                type: ROBBO_ACCOUNT_SAVE_FAILURE,
                payload: {message: 'not_authenticated'}
            });
            return Promise.resolve(false);
        }

        dispatch({type: ROBBO_ACCOUNT_SAVE_START});

        const existingId = account.cloudProjectPageId || '';
        const needCreate = asCopy || !existingId;

        return Promise.resolve()
            .then(() => {
                if (needCreate) {
                    const locale = (state.scratchGui.locales || {}).locale || 'ru';
                    return createProjectPage(locale).then(resp => {
                        const page = resp && resp.projectPage;
                        const id = page && (page.projectPageId || page.projectPageID);
                        if (!id) {
                            throw new Error('create_project_no_id');
                        }
                        return id;
                    });
                }
                return existingId;
            })
            .then(projectPageId => vm.saveProjectSb3().then(blob => ({projectPageId, blob})))
            .then(({projectPageId, blob}) => uploadProjectSb3(projectPageId, blob)
                .then(() => ({projectPageId})))
            .then(({projectPageId}) => {
                const title = (projectTitle || '').trim();
                if (!title) {
                    return {projectPageId};
                }
                return updateProjectPage({
                    projectPageId,
                    title
                }).then(() => ({projectPageId})).catch(err => {
                    // Title sync is best-effort; sb3 already uploaded.
                    log.warn('cloud title update failed', err);
                    return {projectPageId};
                });
            })
            .then(({projectPageId}) => captureStageThumbnail(vm).then(thumb => {
                if (!thumb) {
                    return {projectPageId};
                }
                return uploadProjectPreview(projectPageId, thumb)
                    .then(() => ({projectPageId}))
                    .catch(err => {
                        log.warn('cloud preview upload failed', err);
                        return {projectPageId};
                    });
            }))
            .then(({projectPageId}) => {
                dispatch({
                    type: ROBBO_ACCOUNT_SAVE_SUCCESS,
                    payload: {cloudProjectPageId: projectPageId}
                });
                dispatch(setProjectUnchanged());
                if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                    const params = Object.assign(
                        {},
                        queryString.parse(window.location.search),
                        {projectPageId}
                    );
                    const search = queryString.stringify(params);
                    const hash = window.location.hash || '';
                    window.history.replaceState(
                        null,
                        '',
                        `${window.location.pathname}?${search}${hash}`
                    );
                }
                setTimeout(() => {
                    dispatch(clearSaveStatus());
                }, 2500);
                return true;
            })
            .catch(err => {
                log.warn('cloud save failed', err);
                dispatch({
                    type: ROBBO_ACCOUNT_SAVE_FAILURE,
                    payload: {message: (err && err.message) || 'save_failed'}
                });
                return false;
            });
    };
}

/**
 * Persist project title to ЛК when editing a cloud project.
 * @param {string} newTitle
 */
export function updateCloudProjectTitleThunk (newTitle) {
    return function (dispatch, getState) {
        const title = (newTitle || '').trim();
        dispatch(setProjectTitle(title));
        if (title && typeof document !== 'undefined') {
            document.title = title;
        }
        const account = getState().scratchGui.robboAccount || {};
        const id = account.cloudProjectPageId;
        if (!id || account.sessionStatus !== 'authenticated') {
            showTitleChangedStatus(dispatch);
            return Promise.resolve();
        }
        return updateProjectPage({
            projectPageId: id,
            title
        })
            .then(() => {
                showTitleChangedStatus(dispatch);
            })
            .catch(err => {
                log.warn('cloud rename failed', err);
                showTitleChangedStatus(dispatch);
            });
    };
}

function navigateTop (url) {
    try {
        if (typeof window !== 'undefined' && window.top && window.top !== window) {
            window.top.location.href = url;
            return;
        }
    } catch (e) { /* cross-origin top — fall through */ }
    if (typeof window !== 'undefined') {
        window.location.href = url;
    }
}

/**
 * Inline dropdown password sign-in (MIT-style). Uses POST /auth/sign-in.
 * @param {string} email
 * @param {string} password
 * @returns {function} thunk → Promise<{ok: boolean, status?: number, errorCode?: string}>
 */
export function signInWithPasswordThunk (email, password) {
    return function (dispatch) {
        dispatch({type: ROBBO_ACCOUNT_SESSION_START});
        return signIn(email, password)
            .then(() => dispatch(checkSessionThunk({force: true})))
            .then(status => ({ok: !!(status && status.authenticated)}))
            .catch(err => {
                dispatch({
                    type: ROBBO_ACCOUNT_SESSION_FAILURE,
                    payload: {anonymous: true}
                });
                return {
                    ok: false,
                    status: err && err.status,
                    errorCode: err && err.errorCode
                };
            });
    };
}

export function startOidcLoginThunk (returnTo) {
    return function () {
        const target = returnTo || (typeof window !== 'undefined' ? window.location.href : '');
        navigateTop(oidcStartUrl(target, 'login'));
    };
}

export function startOidcRegisterThunk (returnTo) {
    return function () {
        const target = returnTo || (typeof window !== 'undefined' ? window.location.href : '');
        navigateTop(lmsRegisterUrl(target));
    };
}

const BACKGROUND_SIGN_OUT_UNAVAILABLE = 'background_sign_out_unavailable';

/**
 * Sign out of the LMS and the ЛК session without leaving the editor. The LMS request is
 * opaque (no CORS), so success is judged by the ЛК session being gone afterwards.
 * @returns {Promise<void>} rejects when the editor still has to go through the IdP page
 */
function signOutInBackground () {
    if (!lmsSharesEditorSite() || typeof fetch !== 'function') {
        return Promise.reject(new Error(BACKGROUND_SIGN_OUT_UNAVAILABLE));
    }
    return fetch(idpLogoutUrl(), {mode: 'no-cors', credentials: 'include', cache: 'no-store'})
        .then(() => fetch(bffLogoutClearUrl(), {credentials: 'include', cache: 'no-store'}))
        .then(res => {
            if (!res.ok) {
                throw new Error(`bff_logout_clear_http_${res.status}`);
            }
            return getSessionStatus();
        })
        .then(status => {
            if (status && status.authenticated) {
                throw new Error('bff_session_still_active');
            }
        });
}

/**
 * Sign out of the account (ЛК and LMS — otherwise the next person at this computer is signed
 * straight back in) and leave a clean editor: no cloud project, no autosaved copy of the
 * user's project, which would otherwise be restored for the next visitor of this browser.
 * Stays on the page when the LMS shares the editor's site; otherwise goes through the IdP
 * logout page and comes back (see resolveEditorLogoutReturnTo).
 * @param {function} dispatch redux dispatch
 * @returns {Promise<void>} resolves once signed out here or the redirect has been started
 */
function performSignOut (dispatch) {
    const returnTo = resolveEditorLogoutReturnTo();
    clearAccessTokenMemory();
    return removeSnapshot()
        .catch(err => {
            log.warn('clear draft snapshot before logout failed', err);
        })
        .then(signOutInBackground)
        .then(() => {
            dispatch({type: ROBBO_ACCOUNT_SIGN_OUT});
            return dispatch(resetEditorToDefaultThunk());
        }, err => {
            if (err.message !== BACKGROUND_SIGN_OUT_UNAVAILABLE) {
                log.warn('background sign-out failed, leaving through the IdP page', err);
            }
            // Keep account/project chrome until the browser navigates away — clearing Redux
            // here made the header jump to “Sign in” before the logout redirect finished.
            navigateTop(oidcLogoutUrl(returnTo, {skipIdp: false}));
        });
}

export function signOutThunk () {
    return function (dispatch) {
        return performSignOut(dispatch);
    };
}

/** Sign out after discarding the current unsaved editor contents (the draft goes either way). */
export const signOutDiscardThunk = signOutThunk;

/**
 * Signed out in another tab (LK, LMS or another editor): drop the cloud project from this
 * editor too. Unsaved edits stay on screen (the user can still download them), only the
 * link to the account project goes away.
 * @returns {function} thunk → Promise<void>
 */
export function handleRemoteSignOutThunk () {
    return function (dispatch, getState) {
        // Already signed out here (this tab's own sign-out): the session watch only caught up.
        if ((getState().scratchGui.robboAccount || {}).sessionStatus !== 'authenticated') {
            return Promise.resolve();
        }
        clearAccessTokenMemory();
        dispatch({type: ROBBO_ACCOUNT_SIGN_OUT});
        if (getState().scratchGui.projectChanged) {
            clearProjectPageIdFromUrl();
            return Promise.resolve();
        }
        return dispatch(resetEditorToDefaultThunk());
    };
}
