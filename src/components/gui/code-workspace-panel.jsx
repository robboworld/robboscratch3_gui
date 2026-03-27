/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';

import Blocks from '../../containers/blocks.jsx';
import Box from '../box/box.jsx';
import Watermark from '../../containers/watermark.jsx';
import {generateRobotPythonScript, getReadyRobotPortBaud} from '../../lib/robot-blocks-to-python.js';

import styles from './code-workspace-panel.css';
import guiStyles from './gui.css';
import addExtensionIcon from './icon--extensions.svg';

const MODE_BLOCKS = 'blocks';
const MODE_PYTHON = 'python';

class CodeWorkspacePanel extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            mode: MODE_BLOCKS,
            pythonText: ''
        };
        bindAll(this, [
            'handleClickBlocksTab',
            'handleClickPythonTab',
            'refreshPython',
            'onWorkspaceUpdate',
            'onTargetsUpdate',
            'onPeripheralDeviceChange',
            'handleCopyPython',
            'fallbackCopy'
        ]);
    }

    componentDidMount () {
        const {vm} = this.props;
        if (vm) {
            vm.on('workspaceUpdate', this.onWorkspaceUpdate);
            vm.on('targetsUpdate', this.onTargetsUpdate);
            vm.on('PERIPHERAL_CONNECTED', this.onPeripheralDeviceChange);
            vm.on('PERIPHERAL_DISCONNECTED', this.onPeripheralDeviceChange);
        }
        this.refreshPython();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.vm !== this.props.vm || prevProps.blocksTabVisible !== this.props.blocksTabVisible) {
            this.refreshPython();
        }
    }

    componentWillUnmount () {
        const {vm} = this.props;
        if (vm) {
            vm.removeListener('workspaceUpdate', this.onWorkspaceUpdate);
            vm.removeListener('targetsUpdate', this.onTargetsUpdate);
            vm.removeListener('PERIPHERAL_CONNECTED', this.onPeripheralDeviceChange);
            vm.removeListener('PERIPHERAL_DISCONNECTED', this.onPeripheralDeviceChange);
        }
    }

    onWorkspaceUpdate () {
        if (this.state.mode === MODE_PYTHON) {
            this.refreshPython();
        }
    }

    onTargetsUpdate () {
        if (this.state.mode === MODE_PYTHON) {
            this.refreshPython();
        }
    }

    onPeripheralDeviceChange () {
        if (this.state.mode === MODE_PYTHON) {
            this.refreshPython();
        }
    }

    refreshPython () {
        const {vm} = this.props;
        if (!vm || !vm.editingTarget) {
            this.setState({pythonText: '# Нет активного спрайта\n'});
            return;
        }
        const {portName, baudRate} = getReadyRobotPortBaud(vm);
        const text = generateRobotPythonScript(vm.editingTarget.blocks, {
            portName,
            baudRate,
            spriteName: vm.editingTarget.getName ? vm.editingTarget.getName() : ''
        });
        this.setState({pythonText: text});
    }

    handleClickBlocksTab () {
        this.setState({mode: MODE_BLOCKS});
    }

    handleClickPythonTab () {
        this.setState({mode: MODE_PYTHON}, () => this.refreshPython());
    }

    handleCopyPython () {
        const t = this.state.pythonText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).catch(() => this.fallbackCopy(t));
        } else {
            this.fallbackCopy(t);
        }
    }

    fallbackCopy (text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } finally {
            document.body.removeChild(ta);
        }
    }

    render () {
        const {
            vm,
            blocksTabVisible,
            basePath,
            stageSize,
            canUseCloud,
            onExtensionButtonClick,
            extensionTitle
        } = this.props;
        const {mode, pythonText} = this.state;
        const blocksVisible = blocksTabVisible && mode === MODE_BLOCKS;

        return (
            <Box className={styles.codeWorkspaceRoot}>
                <div className={styles.codeModeBar}>
                    <button
                        className={mode === MODE_BLOCKS ? styles.modeButtonActive : styles.modeButton}
                        type="button"
                        onClick={this.handleClickBlocksTab}
                    >
                        Блоки
                    </button>
                    <button
                        className={mode === MODE_PYTHON ? styles.modeButtonActive : styles.modeButton}
                        type="button"
                        onClick={this.handleClickPythonTab}
                    >
                        Python
                    </button>
                </div>
                <Box
                    className={guiStyles.blocksWrapper}
                    style={{display: mode === MODE_BLOCKS ? '' : 'none'}}
                >
                    <Blocks
                        canUseCloud={canUseCloud}
                        grow={1}
                        isVisible={blocksVisible}
                        options={{
                            media: `${basePath}static/blocks-media/`
                        }}
                        stageSize={stageSize}
                        vm={vm}
                    />
                </Box>
                {mode === MODE_PYTHON ? (
                    <Box className={styles.pythonPanel}>
                        <div className={styles.pythonToolbar}>
                            <button
                                className={styles.copyButton}
                                type="button"
                                onClick={this.handleCopyPython}
                            >
                                Копировать
                            </button>
                        </div>
                        <textarea
                            readOnly
                            className={styles.pythonTextarea}
                            spellCheck={false}
                            value={pythonText}
                            wrap="off"
                        />
                    </Box>
                ) : null}
                <Box className={guiStyles.extensionButtonContainer}>
                    <button
                        className={guiStyles.extensionButton}
                        title={extensionTitle}
                        type="button"
                        onClick={onExtensionButtonClick}
                    >
                        <img
                            className={guiStyles.extensionButtonIcon}
                            draggable={false}
                            src={addExtensionIcon}
                        />
                    </button>
                </Box>
                <Box className={guiStyles.watermark}>
                    <Watermark />
                </Box>
            </Box>
        );
    }
}

CodeWorkspacePanel.propTypes = {
    basePath: PropTypes.string,
    blocksTabVisible: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    extensionTitle: PropTypes.string,
    onExtensionButtonClick: PropTypes.func,
    stageSize: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default CodeWorkspacePanel;
