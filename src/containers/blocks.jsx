import bindAll from 'lodash.bindall';
import debounce from 'lodash.debounce';
import defaultsDeep from 'lodash.defaultsdeep';
import makeToolboxXML from '../lib/make-toolbox-xml';
import PropTypes from 'prop-types';
import React from 'react';
import VMScratchBlocks from '../lib/blocks';
import VM from 'scratch-vm';

import log from '../lib/log.js';
import Prompt from './prompt.jsx';
import BlocksComponent from '../components/blocks/blocks.jsx';
import ExtensionLibrary from './extension-library.jsx';
import extensionData from '../lib/libraries/extensions/index.jsx';
import CustomProcedures from './custom-procedures.jsx';
import errorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import {STAGE_DISPLAY_SIZES} from '../lib/layout-constants';
import DropAreaHOC from '../lib/drop-area-hoc.jsx';
import DragConstants from '../lib/drag-constants';

import {connect} from 'react-redux';
import {updateToolbox} from '../reducers/toolbox';
import {activateColorPicker} from '../reducers/color-picker';
import {closeExtensionLibrary, openSoundRecorder, openConnectionModal} from '../reducers/modals';
import {activateCustomProcedures, deactivateCustomProcedures} from '../reducers/custom-procedures';
import {setConnectionModalExtensionId} from '../reducers/connection-modal';

import {
    activateTab,
    SOUNDS_TAB_INDEX
} from '../reducers/editor-tab';

/** Category column width; flyout is separate (see toolbox.js / flyout_vertical.js). */
const CATEGORY_MENU_WIDTH = 60;
const PALETTE_ANIMATION_MS = 280;
const DEFAULT_FLYOUT_WIDTH = 250;

const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const addFunctionListener = (object, property, callback) => {
    const oldFn = object[property];
    object[property] = function () {
        const result = oldFn.apply(this, arguments);
        callback.apply(this, result);
        return result;
    };
};

const DroppableBlocks = DropAreaHOC([
    DragConstants.BACKPACK_CODE
])(BlocksComponent);

class Blocks extends React.Component {
    constructor (props) {
        super(props);
        this.ScratchBlocks = VMScratchBlocks(props.vm);
        bindAll(this, [
            'attachVM',
            'detachVM',
            'getToolboxXML',
            'handleCategorySelected',
            'handleConnectionModalStart',
            'handleDrop',
            'handleStatusButtonUpdate',
            'handleOpenSoundRecorder',
            'handlePromptStart',
            'handlePromptCallback',
            'handlePromptClose',
            'handleCustomProceduresClose',
            'onScriptGlowOn',
            'onScriptGlowOff',
            'onBlockGlowOn',
            'onBlockGlowOff',
            'handleExtensionAdded',
            'handleBlocksInfoUpdate',
            'onTargetsUpdate',
            'onVisualReport',
            'onWorkspaceUpdate',
            'onWorkspaceMetricsChange',
            'setBlocks',
            'setLocale',
            'updatePaletteVisibility',
            'setFlyoutDomVisible',
            'handleTogglePalette',
            'getInjectionRoot',
            'clearPaletteAnimation',
            'getToolboxFlyout',
            'runPaletteAnimation',
            'expandPaletteThen',
            'installToolboxPaletteInterceptor',
            'cancelFlyoutSlideAnimation',
            'parseFlyoutTranslate',
            'setFlyoutSlideTransform',
            'animateFlyoutSlide'
        ]);
        this._paletteCollapsed = false;
        this.ScratchBlocks.prompt = this.handlePromptStart;
        this.ScratchBlocks.statusButtonCallback = this.handleConnectionModalStart;
        this.ScratchBlocks.recordSoundCallback = this.handleOpenSoundRecorder;

        this.state = {
            workspaceMetrics: {},
            prompt: null,
            paletteAnimating: false
        };
        this.onTargetsUpdate = debounce(this.onTargetsUpdate, 100);
        this.toolboxUpdateQueue = [];
    }
    componentDidMount () {
        this.ScratchBlocks.FieldColourSlider.activateEyedropper_ = this.props.onActivateColorPicker;
        this.ScratchBlocks.Procedures.externalProcedureDefCallback = this.props.onActivateCustomProcedures;
        this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale);

        const workspaceConfig = defaultsDeep({},
            Blocks.defaultOptions,
            this.props.options,
            {rtl: this.props.isRtl, toolbox: this.props.toolboxXML}
        );
        this.workspace = this.ScratchBlocks.inject(this.blocks, workspaceConfig);
        this.installToolboxPaletteInterceptor();

        // Store the xml of the toolbox that is actually rendered.
        // This is used in componentDidUpdate instead of prevProps, because
        // the xml can change while e.g. on the costumes tab.
        this._renderedToolboxXML = this.props.toolboxXML;

        // we actually never want the workspace to enable "refresh toolbox" - this basically re-renders the
        // entire toolbox every time we reset the workspace.  We call updateToolbox as a part of
        // componentDidUpdate so the toolbox will still correctly be updated
        this.setToolboxRefreshEnabled = this.workspace.setToolboxRefreshEnabled.bind(this.workspace);
        this.workspace.setToolboxRefreshEnabled = () => {
            this.setToolboxRefreshEnabled(false);
        };

        // @todo change this when blockly supports UI events
        addFunctionListener(this.workspace, 'translate', this.onWorkspaceMetricsChange);
        addFunctionListener(this.workspace, 'zoom', this.onWorkspaceMetricsChange);

        this.attachVM();
        // Only update blocks/vm locale when visible to avoid sizing issues
        // If locale changes while not visible it will get handled in didUpdate
        if (this.props.isVisible) {
            this.setLocale();
        }
        if (this.props.paletteCollapsed) {
            this.updatePaletteVisibility(true);
        }
    }
    shouldComponentUpdate (nextProps, nextState) {
        return (
            this.state.prompt !== nextState.prompt ||
            this.props.isVisible !== nextProps.isVisible ||
            this._renderedToolboxXML !== nextProps.toolboxXML ||
            this.props.extensionLibraryVisible !== nextProps.extensionLibraryVisible ||
            this.props.customProceduresVisible !== nextProps.customProceduresVisible ||
            this.props.locale !== nextProps.locale ||
            this.props.anyModalVisible !== nextProps.anyModalVisible ||
            this.props.stageSize !== nextProps.stageSize ||
            this.props.extension_pack.is_extension_pack_activated !== nextProps.extension_pack.is_extension_pack_activated || //not original
            this.props.robbo_settings.is_lab_ext_enabled !==  nextProps.robbo_settings.is_lab_ext_enabled ||  //not original
            this.props.robbo_settings.robot_is_scratchduino !==  nextProps.robbo_settings.robot_is_scratchduino || //not original
            this.props.robbo_settings.is_sim_activated !== nextProps.robbo_settings.is_sim_activated ||
            this.props.robbo_settings.is_copter_sim_activated !== nextProps.robbo_settings.is_copter_sim_activated ||
            this.props.paletteCollapsed !== nextProps.paletteCollapsed ||
            this.state.paletteAnimating !== nextState.paletteAnimating
        );
    }
    componentDidUpdate (prevProps) {
        // If any modals are open, call hideChaff to close z-indexed field editors
        if (this.props.anyModalVisible && !prevProps.anyModalVisible) {
            this.ScratchBlocks.hideChaff();
        }

        // Only rerender the toolbox when the blocks are visible and the xml is
        // different from the previously rendered toolbox xml.
        // Do not check against prevProps.toolboxXML because that may not have been rendered.
        if (this.props.isVisible && this.props.toolboxXML !== this._renderedToolboxXML) {
            this.requestToolboxUpdate();
        }

        //modified_by_Yaroslav
        if ((this.props.extension_pack.is_extension_pack_activated !== prevProps.extension_pack.is_extension_pack_activated) || (this.props.robbo_settings.is_lab_ext_enabled !== prevProps.robbo_settings.is_lab_ext_enabled)
          || (this.props.robbo_settings.robot_is_scratchduino !== prevProps.robbo_settings.robot_is_scratchduino)
          || (this.props.robbo_settings.is_sim_activated !== prevProps.robbo_settings.is_sim_activated)
          || (this.props.robbo_settings.is_copter_sim_activated !== prevProps.robbo_settings.is_copter_sim_activated)   ){

          const dynamicBlocksXML = this.props.vm.runtime.getBlocksXML();
          const target = this.props.vm.editingTarget;

          var config = {};
          config.isExternalSensorsActivated = this.props.robbo_settings.is_lab_ext_enabled;
          config.isExtensionPackActivated   = this.props.extension_pack.is_extension_pack_activated;
          config.robot_is_scratchduino      = this.props.robbo_settings.robot_is_scratchduino;
          config.is_sim_activated           = this.props.robbo_settings.is_sim_activated;
          config.is_copter_sim_activated    = this.props.robbo_settings.is_copter_sim_activated;
          config.locale = this.props.locale;
          config.messages = this.props.messages;
          const toolboxXML = makeToolboxXML(target.isStage, target.id, config, dynamicBlocksXML);

          this.props.updateToolboxState(toolboxXML);

        }

        if (this.props.paletteCollapsed !== prevProps.paletteCollapsed &&
            !this.state.paletteAnimating) {
            this.updatePaletteVisibility(this.props.paletteCollapsed);
        }

        if (this.props.isVisible === prevProps.isVisible) {
            if (this.props.stageSize !== prevProps.stageSize ||
                this.props.isRightPanelHidden !== prevProps.isRightPanelHidden) {
                // force workspace to redraw for the new stage size / right panel width
                window.dispatchEvent(new Event('resize'));
            }
            return;
        }
        // @todo hack to resize blockly manually in case resize happened while hidden
        // @todo hack to reload the workspace due to gui bug #413
        if (this.props.isVisible) { // Scripts tab
            this.workspace.setVisible(true);
            if (prevProps.locale !== this.props.locale || this.props.locale !== this.props.vm.getLocale()) {
                // call setLocale if the locale has changed, or changed while the blocks were hidden.
                // vm.getLocale() will be out of sync if locale was changed while not visible
                this.setLocale();
            } else {
                this.props.vm.refreshWorkspace();
            }

            window.dispatchEvent(new Event('resize'));
        } else {
            this.workspace.setVisible(false);
        }
    }
    componentWillUnmount () {
        this.detachVM();
        this.workspace.dispose();
        clearTimeout(this.toolboxUpdateTimeout);
        clearTimeout(this._paletteAnimationTimer);
        this.cancelFlyoutSlideAnimation();
        const root = this.getInjectionRoot();
        if (root) {
            root.classList.remove('flyout-animating-out', 'flyout-animating-in');
        }
    }
    requestToolboxUpdate () {
        clearTimeout(this.toolboxUpdateTimeout);
        this.toolboxUpdateTimeout = setTimeout(() => {
            this.updateToolbox();
        }, 0);
    }
    /**
     * VM formatMessage uses scratch-l10n; Robbo block/reporter strings live in ScratchMsgs.
     * @returns {object}
     */
    getVmLocaleMessages () {
        const scratchMsgs = this.ScratchBlocks.ScratchMsgs.locales[this.props.locale];
        if (!scratchMsgs) {
            return this.props.messages;
        }
        return Object.assign({}, this.props.messages, scratchMsgs);
    }
    setLocale () {
        this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale);
        this.props.vm.setLocale(this.props.locale, this.getVmLocaleMessages())
            .then(() => {
                const flyout = this.workspace.getFlyout();
                if (flyout) flyout.setRecyclingEnabled(false);
                this.props.vm.refreshWorkspace();
                this.requestToolboxUpdate();
                this.withToolboxUpdates(() => {
                    const flyoutAfter = this.workspace.getFlyout();
                    if (flyoutAfter) flyoutAfter.setRecyclingEnabled(true);
                });
            });
    }

    updateToolbox () {
        this.toolboxUpdateTimeout = false;

        if (!this.workspace || !this.workspace.toolbox_) return;

        const categoryId = this.workspace.toolbox_.getSelectedCategoryId();
        const offset = this.workspace.toolbox_.getCategoryScrollOffset();
        this.workspace.updateToolbox(this.props.toolboxXML);
        this._renderedToolboxXML = this.props.toolboxXML;

        // In order to catch any changes that mutate the toolbox during "normal runtime"
        // (variable changes/etc), re-enable toolbox refresh.
        // Using the setter function will rerender the entire toolbox which we just rendered.
        this.workspace.toolboxRefreshEnabled_ = true;

        const currentCategoryPos = this.workspace.toolbox_.getCategoryPositionById(categoryId);
        const currentCategoryLen = this.workspace.toolbox_.getCategoryLengthById(categoryId);
        if (offset < currentCategoryLen) {
            this.workspace.toolbox_.setFlyoutScrollPos(currentCategoryPos + offset);
        } else {
            this.workspace.toolbox_.setFlyoutScrollPos(currentCategoryPos);
        }

        const queue = this.toolboxUpdateQueue;
        this.toolboxUpdateQueue = [];
        queue.forEach(fn => fn());
    }

    withToolboxUpdates (fn) {
        // if there is a queued toolbox update, we need to wait
        if (this.toolboxUpdateTimeout) {
            this.toolboxUpdateQueue.push(fn);
        } else {
            fn();
        }
    }

    attachVM () {
        this.workspace.addChangeListener(this.props.vm.blockListener);
        this.flyoutWorkspace = this.workspace
            .getFlyout()
            .getWorkspace();
        this.flyoutWorkspace.addChangeListener(this.props.vm.flyoutBlockListener);
        this.flyoutWorkspace.addChangeListener(this.props.vm.monitorBlockListener);
        this.props.vm.addListener('SCRIPT_GLOW_ON', this.onScriptGlowOn);
        this.props.vm.addListener('SCRIPT_GLOW_OFF', this.onScriptGlowOff);
        this.props.vm.addListener('BLOCK_GLOW_ON', this.onBlockGlowOn);
        this.props.vm.addListener('BLOCK_GLOW_OFF', this.onBlockGlowOff);
        this.props.vm.addListener('VISUAL_REPORT', this.onVisualReport);
        this.props.vm.addListener('workspaceUpdate', this.onWorkspaceUpdate);
        this.props.vm.addListener('targetsUpdate', this.onTargetsUpdate);
        this.props.vm.addListener('EXTENSION_ADDED', this.handleExtensionAdded);
        this.props.vm.addListener('BLOCKSINFO_UPDATE', this.handleBlocksInfoUpdate);
        this.props.vm.addListener('PERIPHERAL_CONNECTED', this.handleStatusButtonUpdate);
        this.props.vm.addListener('PERIPHERAL_DISCONNECTED', this.handleStatusButtonUpdate);
    }
    detachVM () {
        this.props.vm.removeListener('SCRIPT_GLOW_ON', this.onScriptGlowOn);
        this.props.vm.removeListener('SCRIPT_GLOW_OFF', this.onScriptGlowOff);
        this.props.vm.removeListener('BLOCK_GLOW_ON', this.onBlockGlowOn);
        this.props.vm.removeListener('BLOCK_GLOW_OFF', this.onBlockGlowOff);
        this.props.vm.removeListener('VISUAL_REPORT', this.onVisualReport);
        this.props.vm.removeListener('workspaceUpdate', this.onWorkspaceUpdate);
        this.props.vm.removeListener('targetsUpdate', this.onTargetsUpdate);
        this.props.vm.removeListener('EXTENSION_ADDED', this.handleExtensionAdded);
        this.props.vm.removeListener('BLOCKSINFO_UPDATE', this.handleBlocksInfoUpdate);
        this.props.vm.removeListener('PERIPHERAL_CONNECTED', this.handleStatusButtonUpdate);
        this.props.vm.removeListener('PERIPHERAL_DISCONNECTED', this.handleStatusButtonUpdate);
    }

    updateToolboxBlockValue (id, value) {
        this.withToolboxUpdates(() => {
            const block = this.workspace
                .getFlyout()
                .getWorkspace()
                .getBlockById(id);
            if (block) {
                block.inputList[0].fieldRow[0].setValue(value);
            }
        });
    }

    onTargetsUpdate () {
        if (this.props.vm.editingTarget && this.workspace.getFlyout()) {
            ['glide', 'move', 'set'].forEach(prefix => {
                this.updateToolboxBlockValue(`${prefix}x`, Math.round(this.props.vm.editingTarget.x).toString());
                this.updateToolboxBlockValue(`${prefix}y`, Math.round(this.props.vm.editingTarget.y).toString());
            });
        }
    }
    onWorkspaceMetricsChange () {
        const target = this.props.vm.editingTarget;
        if (target && target.id) {
            const workspaceMetrics = Object.assign({}, this.state.workspaceMetrics, {
                [target.id]: {
                    scrollX: this.workspace.scrollX,
                    scrollY: this.workspace.scrollY,
                    scale: this.workspace.scale
                }
            });
            this.setState({workspaceMetrics});
        }
    }
    onScriptGlowOn (data) {
        this.workspace.glowStack(data.id, true);
    }
    onScriptGlowOff (data) {
        this.workspace.glowStack(data.id, false);
    }
    onBlockGlowOn (data) {
        this.workspace.glowBlock(data.id, true);
    }
    onBlockGlowOff (data) {
        this.workspace.glowBlock(data.id, false);
    }
    onVisualReport (data) {
        this.workspace.reportValue(data.id, data.value);
    }
    getToolboxXML () {
        // Use try/catch because this requires digging pretty deep into the VM
        // Code inside intentionally ignores several error situations (no stage, etc.)
        // Because they would get caught by this try/catch
        try {
            let {editingTarget: target, runtime} = this.props.vm;
            const stage = runtime.getTargetForStage();
            if (!target) target = stage; // If no editingTarget, use the stage

            const stageCostumes = stage.getCostumes();
            const targetCostumes = target.getCostumes();
            const targetSounds = target.getSounds();
            const dynamicBlocksXML = this.props.vm.runtime.getBlocksXML();

            var config = {};
            config.isExternalSensorsActivated = this.props.robbo_settings.is_lab_ext_enabled;
            config.isExtensionPackActivated   = this.props.extension_pack.is_extension_pack_activated;
            config.robot_is_scratchduino      = this.props.robbo_settings.robot_is_scratchduino;
            config.is_sim_activated           = this.props.robbo_settings.is_sim_activated;
            config.is_copter_sim_activated    = this.props.robbo_settings.is_copter_sim_activated;
            config.locale = this.props.locale;
            config.messages = this.props.messages;

            return makeToolboxXML(target.isStage, target.id, config, dynamicBlocksXML,
                targetCostumes[0].name,
                stageCostumes[0].name,
                targetSounds.length > 0 ? targetSounds[0].name : ''
            );
        } catch {
            return null;
        }
    }
    onWorkspaceUpdate (data) {
        // When we change sprites, update the toolbox to have the new sprite's blocks
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }

        if (this.props.vm.editingTarget && !this.state.workspaceMetrics[this.props.vm.editingTarget.id]) {
            this.onWorkspaceMetricsChange();
        }

        // Remove and reattach the workspace listener (but allow flyout events)
        this.workspace.removeChangeListener(this.props.vm.blockListener);
        const dom = this.ScratchBlocks.Xml.textToDom(data.xml);
        try {
            this.ScratchBlocks.Xml.clearWorkspaceAndLoadFromXml(dom, this.workspace);
        } catch (error) {
            // The workspace is likely incomplete. What did update should be
            // functional.
            //
            // Instead of throwing the error, by logging it and continuing as
            // normal lets the other workspace update processes complete in the
            // gui and vm, which lets the vm run even if the workspace is
            // incomplete. Throwing the error would keep things like setting the
            // correct editing target from happening which can interfere with
            // some blocks and processes in the vm.
            if (error.message) {
                error.message = `Workspace Update Error: ${error.message}`;
            }
            log.error(error);
        }
        this.workspace.addChangeListener(this.props.vm.blockListener);

        if (this.props.vm.editingTarget && this.state.workspaceMetrics[this.props.vm.editingTarget.id]) {
            const {scrollX, scrollY, scale} = this.state.workspaceMetrics[this.props.vm.editingTarget.id];
            this.workspace.scrollX = scrollX;
            this.workspace.scrollY = scrollY;
            this.workspace.scale = scale;
            this.workspace.resize();
        }

        // Clear the undo state of the workspace since this is a
        // fresh workspace and we don't want any changes made to another sprites
        // workspace to be 'undone' here.
        this.workspace.clearUndo();
    }
    handleExtensionAdded (blocksInfo) {
        // select JSON from each block info object then reject the pseudo-blocks which don't have JSON, like separators
        // this actually defines blocks and MUST run regardless of the UI state
        this.ScratchBlocks.defineBlocksWithJsonArray(blocksInfo.map(blockInfo => blockInfo.json).filter(x => x));

        // Update the toolbox with new blocks
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }
    }
    handleBlocksInfoUpdate (blocksInfo) {
        // @todo Later we should replace this to avoid all the warnings from redefining blocks.
        this.handleExtensionAdded(blocksInfo);
    }
    handleCategorySelected (categoryId) {
        const selectCategory = () => {
            const extension = extensionData.find(ext => ext.extensionId === categoryId);
            if (extension && extension.launchPeripheralConnectionFlow) {
                this.handleConnectionModalStart(categoryId);
            }

            this.withToolboxUpdates(() => {
                this.workspace.toolbox_.setSelectedCategoryById(categoryId);
            });
        };

        if (this._paletteCollapsed) {
            this.expandPaletteThen(selectCategory);
            return;
        }
        selectCategory();
    }
    installToolboxPaletteInterceptor () {
        const toolbox = this.workspace && this.workspace.toolbox_;
        if (!toolbox || toolbox._paletteExpandInterceptorInstalled) {
            return;
        }

        const blocks = this;
        const originalSetSelectedItem = toolbox.setSelectedItem.bind(toolbox);
        toolbox.setSelectedItem = (item, opt_shouldScroll) => {
            if (item && blocks._paletteCollapsed) {
                blocks.expandPaletteThen(() => {
                    originalSetSelectedItem(item, opt_shouldScroll);
                });
                return;
            }
            originalSetSelectedItem(item, opt_shouldScroll);
        };

        const originalSetSelectedCategoryById = toolbox.setSelectedCategoryById.bind(toolbox);
        toolbox.setSelectedCategoryById = id => {
            if (blocks._paletteCollapsed) {
                blocks.expandPaletteThen(() => {
                    originalSetSelectedCategoryById(id);
                });
                return;
            }
            originalSetSelectedCategoryById(id);
        };

        toolbox._paletteExpandInterceptorInstalled = true;
    }
    expandPaletteThen (then) {
        if (!this._paletteCollapsed) {
            if (then) {
                then();
            }
            return;
        }
        if (this.state.paletteAnimating) {
            this._pendingPaletteExpand = then;
            return;
        }

        if (this.props.onTogglePalette && this.props.paletteCollapsed) {
            this.props.onTogglePalette(false);
        }

        this.setPaletteAnimating(true);
        this.runPaletteAnimation(false, () => {
            if (then) {
                then();
            }
            const pending = this._pendingPaletteExpand;
            this._pendingPaletteExpand = null;
            if (pending) {
                pending();
            }
        });
    }
    setBlocks (blocks) {
        this.blocks = blocks;
    }
    getInjectionRoot () {
        if (!this.blocks) {
            return null;
        }
        return this.blocks.querySelector('.injectionDiv') || this.blocks;
    }
    getToolboxFlyout () {
        if (!this.workspace) {
            return null;
        }
        if (this.workspace.toolbox_ && this.workspace.toolbox_.flyout_) {
            return this.workspace.toolbox_.flyout_;
        }
        return this.workspace.flyout_ || null;
    }
    clearPaletteAnimation () {
        clearTimeout(this._paletteAnimationTimer);
        this._paletteAnimationTimer = null;
        this.cancelFlyoutSlideAnimation();
        const root = this.getInjectionRoot();
        if (root) {
            root.classList.remove('flyout-animating-out', 'flyout-animating-in');
        }
        this.setState({paletteAnimating: false});
    }
    cancelFlyoutSlideAnimation () {
        if (this._flyoutAnimationFrame) {
            cancelAnimationFrame(this._flyoutAnimationFrame);
            this._flyoutAnimationFrame = null;
        }
    }
    parseFlyoutTranslate (flyout) {
        if (!flyout || !flyout.svgGroup_) {
            return {x: CATEGORY_MENU_WIDTH, y: 0};
        }
        const transform = flyout.svgGroup_.style.transform || '';
        const match = transform.match(/translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\)/);
        if (match) {
            return {x: parseFloat(match[1]), y: parseFloat(match[2])};
        }
        return {x: CATEGORY_MENU_WIDTH, y: 0};
    }
    setFlyoutSlideTransform (flyout, x, y, opacity) {
        if (!flyout || !flyout.svgGroup_) {
            return;
        }
        const group = flyout.svgGroup_;
        group.style.transform = `translate(${x}px, ${y}px)`;
        group.style.webkitTransform = group.style.transform;
        if (opacity !== undefined) {
            group.style.opacity = String(opacity);
        }
    }
    animateFlyoutSlide (flyout, fromX, toX, onComplete) {
        if (!flyout || !flyout.svgGroup_) {
            if (onComplete) {
                onComplete();
            }
            return;
        }

        this.cancelFlyoutSlideAnimation();

        flyout.setContainerVisible(true);
        flyout.svgGroup_.style.display = 'block';
        if (flyout.svgBackground_) {
            flyout.svgBackground_.style.display = 'block';
        }

        const {y} = this.parseFlyoutTranslate(flyout);
        const startTime = performance.now();

        const step = now => {
            const t = Math.min(1, (now - startTime) / PALETTE_ANIMATION_MS);
            const eased = easeInOutQuad(t);
            const x = fromX + ((toX - fromX) * eased);
            const opacity = 1 - (eased * 0.4);
            this.setFlyoutSlideTransform(flyout, x, y, opacity);

            if (t < 1) {
                this._flyoutAnimationFrame = requestAnimationFrame(step);
            } else {
                this._flyoutAnimationFrame = null;
                if (onComplete) {
                    onComplete();
                }
            }
        };

        this.setFlyoutSlideTransform(flyout, fromX, y, 1);
        this._flyoutAnimationFrame = requestAnimationFrame(step);
    }
    clearFlyoutSlideStyles (flyout) {
        if (!flyout || !flyout.svgGroup_) {
            return;
        }
        flyout.svgGroup_.style.transition = '';
        flyout.svgGroup_.style.opacity = '';
    }
    setPaletteAnimating (animating) {
        this.setState({paletteAnimating: animating});
    }
    setFlyoutDomVisible (visible) {
        const flyout = this.getToolboxFlyout();
        const root = this.getInjectionRoot();
        if (flyout && flyout.svgGroup_) {
            const display = visible ? '' : 'none';
            flyout.svgGroup_.style.display = display;
            if (flyout.svgBackground_) {
                flyout.svgBackground_.style.display = display;
            }
            if (flyout.scrollbar_ && flyout.scrollbar_.outerSvg_) {
                flyout.scrollbar_.outerSvg_.style.display = display;
            }
        }
        if (!root) {
            return;
        }
        if (visible) {
            root.classList.remove('flyout-palette-collapsed');
        } else {
            root.classList.add('flyout-palette-collapsed');
        }
    }
    updatePaletteVisibility (collapsed) {
        const toolbox = this.workspace && this.workspace.toolbox_;
        const flyout = this.getToolboxFlyout();
        if (!this.workspace || !toolbox || !flyout) {
            return;
        }
        if (collapsed === this._paletteCollapsed) {
            return;
        }
        this._paletteCollapsed = collapsed;

        if (this._savedToolboxWidth === undefined) {
            this._savedToolboxWidth = toolbox.width;
            this._savedFlyoutWidth = flyout.getWidth();
        }

        if (collapsed) {
            toolbox.width = CATEGORY_MENU_WIDTH;
            flyout.DEFAULT_WIDTH = 0;
            flyout.width_ = 0;
            flyout.hide();
            flyout.setContainerVisible(false);

            if (!this._flyoutPositionPatched) {
                this._originalFlyoutPosition = flyout.position.bind(flyout);
                flyout.position = () => {};
                this._flyoutPositionPatched = true;
            }

            this.setFlyoutDomVisible(false);
        } else {
            toolbox.width = this._savedToolboxWidth;
            flyout.DEFAULT_WIDTH = this._savedFlyoutWidth;

            if (this._flyoutPositionPatched) {
                flyout.position = this._originalFlyoutPosition;
                this._flyoutPositionPatched = false;
            }

            flyout.setContainerVisible(true);

            const categoryId = toolbox.getSelectedCategoryId();
            if (categoryId) {
                toolbox.setSelectedCategoryById(categoryId);
            } else {
                flyout.setVisible(true);
            }

            this.setFlyoutDomVisible(true);
        }

        toolbox.position();
        this.ScratchBlocks.svgResize(this.workspace);

        if (collapsed) {
            flyout.hide();
            flyout.setContainerVisible(false);
            this.setFlyoutDomVisible(false);
        }

        window.dispatchEvent(new Event('resize'));
    }
    runPaletteAnimation (collapsed, onComplete) {
        const toolbox = this.workspace && this.workspace.toolbox_;
        const flyout = this.getToolboxFlyout();
        const finish = () => {
            this.setPaletteAnimating(false);
            if (onComplete) {
                onComplete();
            }
        };

        if (!toolbox || !flyout) {
            this.updatePaletteVisibility(collapsed);
            finish();
            return;
        }

        toolbox.position();
        const {x: startX} = this.parseFlyoutTranslate(flyout);
        const flyoutWidth = this._savedFlyoutWidth || flyout.getWidth() || DEFAULT_FLYOUT_WIDTH;
        const isRtl = this.props.isRtl;
        const slideOffset = isRtl ? flyoutWidth : -flyoutWidth;

        if (collapsed) {
            this.animateFlyoutSlide(flyout, startX, startX + slideOffset, () => {
                this.clearFlyoutSlideStyles(flyout);
                this.updatePaletteVisibility(true);
                finish();
            });
            return;
        }

        this.updatePaletteVisibility(false);
        toolbox.position();
        const {x: targetX, y: targetY} = this.parseFlyoutTranslate(flyout);
        const fromX = targetX + slideOffset;

        this.setFlyoutSlideTransform(flyout, fromX, targetY, 0.6);
        requestAnimationFrame(() => {
            this.animateFlyoutSlide(flyout, fromX, targetX, () => {
                this.clearFlyoutSlideStyles(flyout);
                flyout.position();
                finish();
            });
        });
    }
    handleTogglePalette () {
        if (this.state.paletteAnimating) {
            return;
        }
        const nextCollapsed = !this.props.paletteCollapsed;

        if (this.props.onTogglePalette) {
            this.props.onTogglePalette(nextCollapsed);
        }

        this.setPaletteAnimating(true);
        this.runPaletteAnimation(nextCollapsed);
    }
    handlePromptStart (message, defaultValue, callback, optTitle, optVarType) {
        const p = {prompt: {callback, message, defaultValue}};
        p.prompt.title = optTitle ? optTitle :
            this.ScratchBlocks.Msg.VARIABLE_MODAL_TITLE;
        p.prompt.varType = typeof optVarType === 'string' ?
            optVarType : this.ScratchBlocks.SCALAR_VARIABLE_TYPE;
        p.prompt.showVariableOptions = // This flag means that we should show variable/list options about scope
            optVarType !== this.ScratchBlocks.BROADCAST_MESSAGE_VARIABLE_TYPE &&
            p.prompt.title !== this.ScratchBlocks.Msg.RENAME_VARIABLE_MODAL_TITLE &&
            p.prompt.title !== this.ScratchBlocks.Msg.RENAME_LIST_MODAL_TITLE;
        p.prompt.showCloudOption = (optVarType === this.ScratchBlocks.SCALAR_VARIABLE_TYPE) && this.props.canUseCloud;
        this.setState(p);
    }
    handleConnectionModalStart (extensionId) {
        this.props.onOpenConnectionModal(extensionId);
    }
    handleStatusButtonUpdate () {
        this.ScratchBlocks.refreshStatusButtons(this.workspace);
    }
    handleOpenSoundRecorder () {
        this.props.onOpenSoundRecorder();
    }

    /*
     * Pass along information about proposed name and variable options (scope and isCloud)
     * and additional potentially conflicting variable names from the VM
     * to the variable validation prompt callback used in scratch-blocks.
     */
    handlePromptCallback (input, variableOptions) {
        this.state.prompt.callback(
            input,
            this.props.vm.runtime.getAllVarNamesOfType(this.state.prompt.varType),
            variableOptions);
        this.handlePromptClose();
    }
    handlePromptClose () {
        this.setState({prompt: null});
    }
    handleCustomProceduresClose (data) {
        this.props.onRequestCloseCustomProcedures(data);
        const ws = this.workspace;
        ws.refreshToolboxSelection_();
        ws.toolbox_.scrollToCategoryById('myBlocks');
    }
    handleDrop (dragInfo) {
        fetch(dragInfo.payload.bodyUrl)
            .then(response => response.json())
            .then(blocks => this.props.vm.shareBlocksToTarget(blocks, this.props.vm.editingTarget.id))
            .then(() => {
                this.props.vm.refreshWorkspace();
                this.updateToolbox(); // To show new variables/custom blocks
            });
    }
    render () {
        /* eslint-disable no-unused-vars */
        const {
            anyModalVisible,
            canUseCloud,
            customProceduresVisible,
            extensionLibraryVisible,
            options,
            stageSize,
            vm,
            isRtl,
            isVisible,
            paletteCollapsed,
            paletteToggleTitle,
            onTogglePalette,
            onActivateColorPicker,
            onOpenConnectionModal,
            onOpenSoundRecorder,
            updateToolboxState,
            onActivateCustomProcedures,
            onRequestCloseExtensionLibrary,
            onRequestCloseCustomProcedures,
            toolboxXML,
            ...props
        } = this.props;
        /* eslint-enable no-unused-vars */
        return (
            <React.Fragment>
                <DroppableBlocks
                    componentRef={this.setBlocks}
                    onDrop={this.handleDrop}
                    paletteCollapsed={paletteCollapsed}
                    paletteAnimating={this.state.paletteAnimating}
                    paletteToggleTitle={paletteToggleTitle}
                    onTogglePalette={this.handleTogglePalette}
                    {...props}
                />
                {this.state.prompt ? (
                    <Prompt
                        defaultValue={this.state.prompt.defaultValue}
                        isStage={vm.runtime.getEditingTarget().isStage}
                        label={this.state.prompt.message}
                        showCloudOption={this.state.prompt.showCloudOption}
                        showVariableOptions={this.state.prompt.showVariableOptions}
                        title={this.state.prompt.title}
                        vm={vm}
                        onCancel={this.handlePromptClose}
                        onOk={this.handlePromptCallback}
                    />
                ) : null}
                {extensionLibraryVisible ? (
                    <ExtensionLibrary
                        vm={vm}
                        onCategorySelected={this.handleCategorySelected}
                        onRequestClose={onRequestCloseExtensionLibrary}
                    />
                ) : null}
                {customProceduresVisible ? (
                    <CustomProcedures
                        options={{
                            media: options.media
                        }}
                        onRequestClose={this.handleCustomProceduresClose}
                    />
                ) : null}
            </React.Fragment>
        );
    }
}

Blocks.propTypes = {
    anyModalVisible: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    customProceduresVisible: PropTypes.bool,
    extensionLibraryVisible: PropTypes.bool,
    isRtl: PropTypes.bool,
    isVisible: PropTypes.bool,
    paletteCollapsed: PropTypes.bool,
    paletteToggleTitle: PropTypes.string,
    onTogglePalette: PropTypes.func, // (collapsed: boolean) => void
    locale: PropTypes.string.isRequired,
    messages: PropTypes.objectOf(PropTypes.string),
    onActivateColorPicker: PropTypes.func,
    onActivateCustomProcedures: PropTypes.func,
    onOpenConnectionModal: PropTypes.func,
    onOpenSoundRecorder: PropTypes.func,
    onRequestCloseCustomProcedures: PropTypes.func,
    onRequestCloseExtensionLibrary: PropTypes.func,
    options: PropTypes.shape({
        media: PropTypes.string,
        zoom: PropTypes.shape({
            controls: PropTypes.bool,
            wheel: PropTypes.bool,
            startScale: PropTypes.number
        }),
        colours: PropTypes.shape({
            workspace: PropTypes.string,
            flyout: PropTypes.string,
            toolbox: PropTypes.string,
            toolboxSelected: PropTypes.string,
            scrollbar: PropTypes.string,
            scrollbarHover: PropTypes.string,
            insertionMarker: PropTypes.string,
            insertionMarkerOpacity: PropTypes.number,
            fieldShadow: PropTypes.string,
            dragShadowOpacity: PropTypes.number
        }),
        comments: PropTypes.bool,
        collapse: PropTypes.bool
    }),
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    toolboxXML: PropTypes.string,
    updateToolboxState: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

Blocks.defaultOptions = {
    zoom: {
        controls: true,
        wheel: true,
        startScale: 0.675
    },
    grid: {
        spacing: 40,
        length: 2,
        colour: '#ddd'
    },
    colours: {
        workspace: '#F9F9F9',
        flyout: '#F9F9F9',
        toolbox: '#FFFFFF',
        toolboxSelected: '#E9EEF2',
        scrollbar: '#CECDCE',
        scrollbarHover: '#CECDCE',
        insertionMarker: '#000000',
        insertionMarkerOpacity: 0.2,
        fieldShadow: 'rgba(255, 255, 255, 0.3)',
        dragShadowOpacity: 0.6
    },
    comments: true,
    collapse: false,
    sounds: false
};

Blocks.defaultProps = {
    isVisible: true,
    paletteCollapsed: false,
    options: Blocks.defaultOptions
};

const mapStateToProps = state => ({
    isRightPanelHidden: state.scratchGui.layoutVisibility.isRightPanelHidden,
    anyModalVisible: (
        Object.keys(state.scratchGui.modals).some(key => state.scratchGui.modals[key]) ||
        state.scratchGui.mode.isFullScreen
    ),
    extensionLibraryVisible: state.scratchGui.modals.extensionLibrary,
    isRtl: state.locales.isRtl,
    locale: state.locales.locale,
    messages: state.locales.messages,
    toolboxXML: state.scratchGui.toolbox.toolboxXML,
    customProceduresVisible: state.scratchGui.customProcedures.active,
    extension_pack:  state.scratchGui.extension_pack,
    robbo_settings: state.scratchGui.settings
});

const mapDispatchToProps = dispatch => ({
    onActivateColorPicker: callback => dispatch(activateColorPicker(callback)),
    onActivateCustomProcedures: (data, callback) => dispatch(activateCustomProcedures(data, callback)),
    onOpenConnectionModal: id => {
        dispatch(setConnectionModalExtensionId(id));
        dispatch(openConnectionModal());
    },
    onOpenSoundRecorder: () => {
        dispatch(activateTab(SOUNDS_TAB_INDEX));
        dispatch(openSoundRecorder());
    },
    onRequestCloseExtensionLibrary: () => {
        dispatch(closeExtensionLibrary());
    },
    onRequestCloseCustomProcedures: data => {
        dispatch(deactivateCustomProcedures(data));
    },
    updateToolboxState: toolboxXML => {
        dispatch(updateToolbox(toolboxXML));
    }
});

export default errorBoundaryHOC('Blocks')(
    connect(
        mapStateToProps,
        mapDispatchToProps
    )(Blocks)
);
