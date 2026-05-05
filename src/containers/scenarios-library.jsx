import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape, FormattedMessage} from 'react-intl';
import VM from 'scratch-vm';

import LibraryComponent from '../components/library/library.jsx';
import Modal from '../containers/modal.jsx';
import Loader from '../components/loader/loader.jsx';
import analytics from '../lib/analytics';
import log from '../lib/log';
import {
    LoadingStates,
    getIsLoadingUpload,
    onLoadedProject,
    requestProjectUpload
} from '../reducers/project-state';
import {
    openLoadingProject,
    closeLoadingProject
} from '../reducers/modals';
import {closeFileMenu} from '../reducers/menus';

const SCENARIOS_DIR = 'static/scenarios/';
const MANIFEST_FILE = 'manifest.json';

const messages = defineMessages({
    title: {
        id: 'gui.scenariosLibrary.title',
        defaultMessage: 'Scenarios',
        description: 'Title for the fullscreen scenarios library'
    },
    loadError: {
        id: 'gui.scenariosLibrary.loadError',
        defaultMessage: 'Could not load this scenario.',
        description: 'Error when fetching or loading a bundled scenario .sb3'
    },
    manifestError: {
        id: 'gui.scenariosLibrary.manifestError',
        defaultMessage: 'Could not load the scenarios list. Check static/scenarios/manifest.json.',
        description: 'Shown when manifest.json failed to load'
    }
});

const encodePathSegments = rel =>
    rel.replace(/^\.\//, '').split('/').map(seg => encodeURIComponent(seg)).join('/');

const resolveAssetUrl = (prefix, ref) => {
    const p = (ref && String(ref).trim()) || '';
    if (!p) {
        return '';
    }
    if (/^https?:\/\//i.test(p) || p.startsWith('//')) {
        return p;
    }
    if (p.startsWith('/')) {
        return p;
    }
    if (p.startsWith('static/')) {
        const rest = p.slice('static/'.length);
        return `${prefix}static/${encodePathSegments(rest)}`;
    }
    return `${prefix}${SCENARIOS_DIR}${encodePathSegments(p)}`;
};

const normalizeManifestRows = (raw, prefix, intl) => {
    const list = Array.isArray(raw) ? raw : (raw && raw.scenarios) || [];
    const locale = intl && intl.locale ? intl.locale : '';
    const useRu = typeof locale === 'string' && locale.toLowerCase().indexOf('ru') === 0;
    return list.map((row, index) => {
        const sb3Ref = row.sb3 || row.file;
        if (!sb3Ref || !String(sb3Ref).trim()) {
            return null;
        }
        const titleRaw = useRu ?
            (row.titleRu || row.title || row.name) :
            (row.title || row.name);
        const title = (titleRaw && String(titleRaw).trim()) || `Scenario ${index + 1}`;
        const stem = String(sb3Ref)
            .replace(/^.*\//, '')
            .replace(/\.sb3$/i, '') || `item-${index}`;
        const id = (row.id && String(row.id).trim()) ||
            `${stem}-${index}`;
        const description = useRu && row.descriptionRu ?
            row.descriptionRu :
            (row.description || '');
        const tags = (Array.isArray(row.tags) && row.tags.length) ?
            row.tags.map(t => String(t).toLowerCase()) :
            ['robbo'];
        const previewRef = row.preview || row.image || '';
        let rawURL = resolveAssetUrl(prefix, previewRef);
        if (!rawURL) {
            rawURL = `${prefix}static/assets/RobboPlatform.svg`;
        }
        return {
            id,
            name: title,
            description,
            tags,
            rawURL,
            sb3Url: resolveAssetUrl(prefix, sb3Ref),
            scenarioCard: true
        };
    }).filter(Boolean);
};

const tagsFromData = data => {
    const set = new Set();
    data.forEach(d => (d.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort().map(tag => ({
        tag,
        intlLabel: {
            id: `gui.scenariosLibrary.tag.${tag}`,
            defaultMessage: tag.length ? tag.charAt(0).toUpperCase() + tag.slice(1) : tag,
            description: `Filter tag for scenario library (${tag})`
        }
    }));
};

class ScenariosLibrary extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'fetchManifest',
            'handleItemSelect',
            'loadPendingScenario'
        ]);
        this.pendingScenarioItem = null;
        this.state = {
            manifestRaw: null,
            manifestLoading: false,
            manifestError: false
        };
    }
    componentDidMount () {
        if (this.props.visible && this.state.manifestRaw === null && !this.state.manifestLoading) {
            this.fetchManifest();
        }
    }
    componentDidUpdate (prevProps) {
        if (this.props.isLoadingUpload && !prevProps.isLoadingUpload && this.pendingScenarioItem) {
            this.loadPendingScenario();
        }
        if (this.props.visible && !prevProps.visible) {
            if (this.state.manifestRaw === null && !this.state.manifestLoading && !this.state.manifestError) {
                this.fetchManifest();
            }
        }
    }
    fetchManifest () {
        const prefix = typeof this.props.basePath === 'string' ? this.props.basePath : './';
        const url = `${prefix}${SCENARIOS_DIR}${MANIFEST_FILE}`;
        this.setState({manifestLoading: true, manifestError: false});
        fetch(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(json => {
                this.setState({
                    manifestRaw: json,
                    manifestLoading: false,
                    manifestError: false
                });
            })
            .catch(err => {
                log.warn(err);
                this.setState({
                    manifestRaw: null,
                    manifestLoading: false,
                    manifestError: true
                });
            });
    }
    handleItemSelect (item) {
        this.pendingScenarioItem = item;
        this.props.requestProjectUpload(this.props.loadingState);
        analytics.event({
            category: 'library',
            action: 'Select Scenario',
            label: item.id
        });
    }
    loadPendingScenario () {
        const item = this.pendingScenarioItem;
        this.pendingScenarioItem = null;
        if (!item || !item.sb3Url) {
            return;
        }

        this.props.onLoadingStarted();
        fetch(item.sb3Url)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.arrayBuffer();
            })
            .then(buffer => this.props.vm.loadProject(buffer))
            .then(() => {
                history.replaceState({}, document.title, '.');
                this.props.onLoadingFinished(this.props.loadingState, true);
                const title = typeof item.name === 'string' ? item.name.substring(0, 100) : '';
                if (title) {
                    this.props.onUpdateProjectTitle(title);
                    window.document.title = title;
                }
            })
            .catch(err => {
                log.warn(err);
                alert(this.props.intl.formatMessage(messages.loadError)); // eslint-disable-line no-alert
                this.props.onLoadingFinished(this.props.loadingState, false);
            });
    }
    render () {
        if (!this.props.visible) {
            return null;
        }
        const prefix = typeof this.props.basePath === 'string' ? this.props.basePath : './';
        const modalTitle = this.props.intl.formatMessage(messages.title);

        if (this.state.manifestLoading) {
            return (
                <Modal
                    contentLabel={modalTitle}
                    fullScreen
                    id="scenariosLibrary"
                    onRequestClose={this.props.onRequestClose}
                >
                    <Loader />
                </Modal>
            );
        }
        if (this.state.manifestError) {
            return (
                <Modal
                    contentLabel={modalTitle}
                    fullScreen
                    id="scenariosLibrary"
                    onRequestClose={this.props.onRequestClose}
                >
                    <div style={{margin: '2rem auto', maxWidth: '28rem', textAlign: 'center'}}>
                        <p><FormattedMessage {...messages.manifestError} /></p>
                    </div>
                </Modal>
            );
        }

        const data = this.state.manifestRaw === null ?
            [] :
            normalizeManifestRows(this.state.manifestRaw, prefix, this.props.intl);
        const tagList = tagsFromData(data);

        return (
            <LibraryComponent
                filterable
                data={data}
                id="scenariosLibrary"
                scrollGridVariant="scenarios"
                tags={tagList}
                title={modalTitle}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

ScenariosLibrary.propTypes = {
    basePath: PropTypes.string,
    // passed via mergeProps for onLoadingFinished(…, canSave); not read in this component
    // eslint-disable-next-line react/no-unused-prop-types
    canSave: PropTypes.bool,
    intl: intlShape.isRequired,
    isLoadingUpload: PropTypes.bool,
    loadingState: PropTypes.oneOf(LoadingStates),
    onLoadingFinished: PropTypes.func.isRequired,
    onLoadingStarted: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    onUpdateProjectTitle: PropTypes.func,
    requestProjectUpload: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

ScenariosLibrary.defaultProps = {
    basePath: './',
    onUpdateProjectTitle: () => {}
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.scenariosLibrary,
    isLoadingUpload: getIsLoadingUpload(state.scratchGui.projectState.loadingState),
    loadingState: state.scratchGui.projectState.loadingState,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = (dispatch, ownProps) => ({
    requestProjectUpload: loadingState => dispatch(requestProjectUpload(loadingState)),
    onLoadingStarted: () => dispatch(openLoadingProject()),
    onLoadingFinished: (loadingState, success) => {
        dispatch(onLoadedProject(loadingState, ownProps.canSave, success));
        dispatch(closeLoadingProject());
        dispatch(closeFileMenu());
    }
});

const mergeProps = (stateProps, dispatchProps, ownProps) =>
    Object.assign({}, stateProps, dispatchProps, ownProps);

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
)(ScenariosLibrary));
