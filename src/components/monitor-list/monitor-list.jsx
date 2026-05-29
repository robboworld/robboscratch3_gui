import React from 'react';
import classNames from 'classnames';
import Box from '../box/box.jsx';
import Monitor from '../../containers/monitor.jsx';
import PropTypes from 'prop-types';
import {OrderedMap} from 'immutable';
import {stageSizeToTransform} from '../../lib/screen-utils';

import styles from './monitor-list.css';

const isVariableMonitor = monitorData => (
    monitorData.opcode === 'data_variable' ||
    monitorData.opcode === 'data_listcontents'
);

const MonitorList = props => {
    const isCornerLayout = props.layout === 'corner';
    const visibleMonitors = props.monitors.valueSeq().filter(m => m.visible);
    const monitorsToShow = isCornerLayout ?
        visibleMonitors.filter(isVariableMonitor) :
        visibleMonitors;

    if (isCornerLayout) {
        return (
            <Box
                className={classNames(
                    styles.monitorList,
                    styles.monitorListCorner,
                    'monitor-overlay'
                )}
            >
                {monitorsToShow.map(monitorData => (
                    <Monitor
                        draggable={false}
                        height={monitorData.height}
                        id={monitorData.id}
                        key={monitorData.id}
                        layout="corner"
                        max={monitorData.sliderMax}
                        min={monitorData.sliderMin}
                        mode={monitorData.mode}
                        opcode={monitorData.opcode}
                        params={monitorData.params}
                        spriteName={monitorData.spriteName}
                        targetId={monitorData.targetId}
                        value={monitorData.value}
                        width={monitorData.width}
                        x={monitorData.x}
                        y={monitorData.y}
                        onDragEnd={props.onMonitorChange}
                    />
                ))}
            </Box>
        );
    }

    return (
    <Box
        // Use static `monitor-overlay` class for bounds of draggables
        className={classNames(styles.monitorList, 'monitor-overlay')}
        style={{
            width: props.stageSize.width,
            height: props.stageSize.height
        }}
    >
        <Box
            className={styles.monitorListScaler}
            style={stageSizeToTransform(props.stageSize)}
        >
            {monitorsToShow.map(monitorData => (
                    <Monitor
                        draggable={props.draggable}
                        height={monitorData.height}
                        id={monitorData.id}
                        key={monitorData.id}
                        max={monitorData.sliderMax}
                        min={monitorData.sliderMin}
                        mode={monitorData.mode}
                        opcode={monitorData.opcode}
                        params={monitorData.params}
                        spriteName={monitorData.spriteName}
                        targetId={monitorData.targetId}
                        value={monitorData.value}
                        width={monitorData.width}
                        x={monitorData.x}
                        y={monitorData.y}
                        onDragEnd={props.onMonitorChange}
                    />
                ))}
        </Box>
    </Box>
    );
};

MonitorList.propTypes = {
    layout: PropTypes.oneOf(['stage', 'corner']),
    draggable: PropTypes.bool.isRequired,
    monitors: PropTypes.instanceOf(OrderedMap),
    onMonitorChange: PropTypes.func.isRequired,
    stageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number,
        widthDefault: PropTypes.number,
        heightDefault: PropTypes.number
    }).isRequired
};

export default MonitorList;
