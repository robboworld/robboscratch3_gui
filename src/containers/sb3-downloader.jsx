import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {saveProjectThunk} from '../lib/project-save-actions';
/**
 * Project saver component passes a downloadProject function to its child.
 * It expects this child to be a function with the signature
 *     function (downloadProject, props) {}
 * The component can then be used to attach project saving functionality
 * to any other component:
 *
 * <SB3Downloader>{(downloadProject, props) => (
 *     <MyCoolComponent
 *         onClick={downloadProject}
 *         {...props}
 *     />
 * )}</SB3Downloader>
 *
 * downloadProject is "Save as": it always asks for a location (see lib/project-save-actions.js).
 */
class SB3Downloader extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'downloadProject'
        ]);
    }
    downloadProject () {
        return this.props.onSaveProjectAs()
            .then(result => {
                if (result && result.method !== 'aborted' && this.props.onSaveFinished) {
                    this.props.onSaveFinished();
                }
                return result;
            });
    }
    render () {
        const {
            children
        } = this.props;
        return children(
            this.props.className,
            this.downloadProject
        );
    }
}

SB3Downloader.propTypes = {
    children: PropTypes.func,
    className: PropTypes.string,
    onSaveFinished: PropTypes.func,
    onSaveProjectAs: PropTypes.func
};
SB3Downloader.defaultProps = {
    className: ''
};

const mapDispatchToProps = dispatch => ({
    onSaveProjectAs: () => dispatch(saveProjectThunk({saveAs: true}))
});

export default connect(
    () => ({}),
    mapDispatchToProps
)(SB3Downloader);
