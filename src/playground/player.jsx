import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';
import {compose} from 'redux';

import Box from '../components/box/box.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import EmbedProjectLoaderHOC from '../lib/embed-project-loader-hoc.jsx';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import TitledHOC from '../lib/titled-hoc.jsx';

import {setPlayer} from '../reducers/mode';

import styles from './player.css';

const Player = ({isPlayerOnly, onSeeInside, projectId, embedMode}) => {
    useEffect(() => {
        if (!embedMode) return undefined;
        document.documentElement.classList.add('player-embed');
        return () => document.documentElement.classList.remove('player-embed');
    }, [embedMode]);

    useEffect(() => {
        if (!embedMode || typeof ResizeObserver === 'undefined') return undefined;
        const notifyResize = () => window.dispatchEvent(new Event('resize'));
        const observer = new ResizeObserver(notifyResize);
        observer.observe(document.documentElement);
        if (document.body) observer.observe(document.body);
        notifyResize();
        return () => observer.disconnect();
    }, [embedMode]);

    return (
    <Box className={classNames(
        isPlayerOnly ? styles.stageOnly : styles.editor,
        embedMode && styles.stageOnlyEmbed
    )}>
        {isPlayerOnly && !embedMode && <button onClick={onSeeInside}>{'See inside'}</button>}
        <GUI
            enableCommunity
            isPlayerOnly={isPlayerOnly}
            embedMode={embedMode}
            projectId={projectId}
            canSave={false}
            canCreateNew={false}
        />
    </Box>
    );
};

Player.propTypes = {
    isPlayerOnly: PropTypes.bool,
    onSeeInside: PropTypes.func,
    projectId: PropTypes.string,
    embedMode: PropTypes.bool
};

const mapStateToProps = state => ({
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly
});

const mapDispatchToProps = dispatch => ({
    onSeeInside: () => dispatch(setPlayer(false))
});

const ConnectedPlayer = connect(
    mapStateToProps,
    mapDispatchToProps
)(Player);

const HashParserOptionalHOC = function (WrappedComponent) {
    const HashWrapped = HashParserHOC(WrappedComponent);
    const Optional = props => {
        if (props.skipHashParser) {
            return <WrappedComponent {...props} />;
        }
        return <HashWrapped {...props} />;
    };
    Optional.propTypes = {
        skipHashParser: PropTypes.bool
    };
    return Optional;
};

const WrappedPlayer = compose(
    AppStateHOC,
    EmbedProjectLoaderHOC,
    HashParserOptionalHOC,
    TitledHOC
)(ConnectedPlayer);

const appTarget = document.createElement('div');
document.body.appendChild(appTarget);

if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
    const q = new URLSearchParams(window.location.search);
    if (q.get('embed') !== '1') {
        window.onbeforeunload = () => true;
    }
}

ReactDOM.render(<WrappedPlayer isPlayerOnly />, appTarget);
