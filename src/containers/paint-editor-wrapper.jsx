import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import VM from 'scratch-vm';
import PaintEditor from 'scratch-paint';

import {installPaintEditorPageZoomPatches, teardownPaintEditorPageZoomPatches, needsPageZoomCoordCompensation} from '../lib/page-zoom-coords';
import {connect} from 'react-redux';

class PaintEditorWrapper extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleUpdateImage',
            'handleUpdateName',
            'setRoot',
            'schedulePaintPageZoomFix'
        ]);
    }
    componentDidMount () {
        this._paintFixAttempts = 0;
        this.onFitScale = () => {
            if (!needsPageZoomCoordCompensation()) return;
            if (this._paintZoomInstalled === this.props.imageId) {
                this._paintZoomInstalled = null;
                if (this.rootEl) {
                    const canvas = this.rootEl.querySelector('canvas');
                    if (canvas) {
                        canvas.__rs3PaintClientPatched = false;
                        canvas.__rs3PaintViewSized = false;
                        delete canvas.__rs3PaintBaseline;
                        delete canvas.__rs3PaintContainer;
                    }
                }
            }
            this._paintFixAttempts = 0;
            this.schedulePaintPageZoomFix();
        };
        window.addEventListener('robboFitScaleApplied', this.onFitScale);
        this.schedulePaintPageZoomFix();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.imageId !== this.props.imageId) {
            this._paintZoomInstalled = null;
            this._paintFixAttempts = 0;
            this.schedulePaintPageZoomFix();
        }
    }
    componentWillUnmount () {
        window.removeEventListener('robboFitScaleApplied', this.onFitScale);
        clearTimeout(this._paintFixTimer);
        teardownPaintEditorPageZoomPatches(this.rootEl);
    }
    setRoot (el) {
        this.rootEl = el;
    }
    schedulePaintPageZoomFix () {
        if (!needsPageZoomCoordCompensation()) return;
        if (this._paintZoomInstalled === this.props.imageId) return;
        clearTimeout(this._paintFixTimer);
        this._paintFixTimer = setTimeout(() => {
            if (!this.rootEl || this._paintZoomInstalled === this.props.imageId) return;
            const installed = installPaintEditorPageZoomPatches(this.rootEl, this.props.imageId);
            if (installed) {
                this._paintZoomInstalled = this.props.imageId;
                return;
            }
            this._paintFixAttempts += 1;
            if (this._paintFixAttempts < 8) {
                this.schedulePaintPageZoomFix();
            }
        }, 250);
    }
    shouldComponentUpdate (nextProps) {
        return this.props.imageId !== nextProps.imageId ||
            this.props.rtl !== nextProps.rtl ||
            this.props.name !== nextProps.name;
    }
    handleUpdateName (name) {
        this.props.vm.renameCostume(this.props.selectedCostumeIndex, name);
    }
    handleUpdateImage (isVector, image, rotationCenterX, rotationCenterY) {
        if (isVector) {
            this.props.vm.updateSvg(
                this.props.selectedCostumeIndex,
                image,
                rotationCenterX,
                rotationCenterY);
        } else {
            this.props.vm.updateBitmap(
                this.props.selectedCostumeIndex,
                image,
                rotationCenterX,
                rotationCenterY,
                2 /* bitmapResolution */);
        }
    }
    render () {
        if (!this.props.imageId) return null;
        const {
            selectedCostumeIndex,
            vm,
            ...componentProps
        } = this.props;

        return (
            <div
                ref={this.setRoot}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: '1 1 auto',
                    minHeight: 0,
                    minWidth: 0
                }}
            >
                <PaintEditor
                    {...componentProps}
                    image={vm.getCostume(selectedCostumeIndex)}
                    onUpdateImage={this.handleUpdateImage}
                    onUpdateName={this.handleUpdateName}
                />
            </div>
        );
    }
}

PaintEditorWrapper.propTypes = {
    imageFormat: PropTypes.string.isRequired,
    imageId: PropTypes.string.isRequired,
    name: PropTypes.string,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    rtl: PropTypes.bool,
    selectedCostumeIndex: PropTypes.number.isRequired,
    vm: PropTypes.instanceOf(VM)
};

const mapStateToProps = (state, {selectedCostumeIndex}) => {
    const targetId = state.scratchGui.vm.editingTarget.id;
    const sprite = state.scratchGui.vm.editingTarget.sprite;
    // Make sure the costume index doesn't go out of range.
    const index = selectedCostumeIndex < sprite.costumes.length ?
        selectedCostumeIndex : sprite.costumes.length - 1;
    const costume = state.scratchGui.vm.editingTarget.sprite.costumes[index];
    return {
        name: costume && costume.name,
        rotationCenterX: costume && costume.rotationCenterX,
        rotationCenterY: costume && costume.rotationCenterY,
        imageFormat: costume && costume.dataFormat,
        imageId: targetId && `${targetId}${costume.skinId}`,
        rtl: state.locales.isRtl,
        selectedCostumeIndex: index,
        vm: state.scratchGui.vm,
        zoomLevelId: targetId
    };
};

export default connect(
    mapStateToProps
)(PaintEditorWrapper);
