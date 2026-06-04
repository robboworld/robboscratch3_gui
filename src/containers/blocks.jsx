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
import {getIsShowingProject} from '../reducers/project-state';
import {
    BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT,
    clampFlyoutWidth,
    setBlocksWorkspaceLayoutPending
} from '../reducers/layout-visibility';
import {getEventXY} from '../lib/touch-utils';

/** Category column width; flyout is separate (see toolbox.js / flyout_vertical.js). */
const CATEGORY_MENU_WIDTH = 60;
const PALETTE_ANIMATION_MS = 400;
const DEFAULT_FLYOUT_WIDTH = BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT;
const WORKSPACE_LAYOUT_PENDING_TIMEOUT_MS = 5000;

const easeInOutCubic = t => (t < 0.5 ?
    4 * t * t * t :
    1 - Math.pow(-2 * t + 2, 3) / 2);

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
            'animateFlyoutSlide',
            'applyPaletteFlyoutWidth',
            'handlePaletteResizePointerDown',
            'setToolboxLayoutWidth',
            'compensateWorkspaceScrollForToolboxWidthChange',
            'setFlyoutScrollbarVisible',
            'syncPaletteChromeFlyoutWidth',
            'ensureFlyoutBlocksLayoutAtFullWidth',
            'ensureFlyoutBlocksLayoutThenCollapse',
            'repairFlyoutBlockLayout',
            'rerenderFlyoutBlocksAtFullWidth',
            'scheduleFlyoutLayoutRepair',
            'centerWorkspaceView',
            'tryCenterWorkspaceView',
            'runInitialWorkspaceCenter',
            'beginInitialWorkspaceLayout',
            'finishInitialWorkspaceLayout',
            'scheduleWorkspaceScrollCenter',
            'beginHiddenFlyoutRepair',
            'endHiddenFlyoutRepair'
        ]);
        this._flyoutLayoutRepairFrame = null;
        this._workspaceScrollCenterFrame = null;
        this._pendingInitialWorkspaceCenter = true;
        this._paletteCollapsed = false;
        this.ScratchBlocks.prompt = this.handlePromptStart;
        this.ScratchBlocks.statusButtonCallback = this.handleConnectionModalStart;
        this.ScratchBlocks.recordSoundCallback = this.handleOpenSoundRecorder;

        this.state = {
            workspaceMetrics: {},
            prompt: null,
            paletteAnimating: false,
            paletteResizing: false,
            blocksLayoutPending: false
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

        if (this.props.paletteCollapsed) {
            const toolbox = this.workspace.toolbox_;
            const flyout = this.getToolboxFlyout();
            const flyoutWidth = clampFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
            this._savedFlyoutWidth = flyoutWidth;
            this._savedToolboxWidth = CATEGORY_MENU_WIDTH + flyoutWidth;
            this._paletteCollapsed = true;
            if (toolbox) {
                this.setToolboxLayoutWidth(toolbox, CATEGORY_MENU_WIDTH, {skipScrollCompensation: true});
            }
            if (flyout) {
                flyout.DEFAULT_WIDTH = flyoutWidth;
                flyout.setContainerVisible(false);
                if (!this._flyoutPositionPatched) {
                    this._originalFlyoutPosition = flyout.position.bind(flyout);
                    flyout.position = () => {};
                    this._flyoutPositionPatched = true;
                }
            }
            this.setFlyoutDomVisible(false);
            if (this.blocks) {
                this.blocks.style.setProperty('--blocks-flyout-width', '0px');
            }
        }

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
            this.ensureFlyoutBlocksLayoutThenCollapse();
        } else {
            this.applyPaletteFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
        }
        if (this.props.isShowingProject && this._pendingInitialWorkspaceCenter) {
            this.beginInitialWorkspaceLayout();
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
            this.props.isRobboUiHidden !== nextProps.isRobboUiHidden ||
            this.props.paletteCollapsed !== nextProps.paletteCollapsed ||
            this.props.blocksPaletteFlyoutWidth !== nextProps.blocksPaletteFlyoutWidth ||
            this.props.isBlocksWorkspaceLayoutPending !== nextProps.isBlocksWorkspaceLayoutPending ||
            this.state.paletteAnimating !== nextState.paletteAnimating ||
            this.state.paletteResizing !== nextState.paletteResizing ||
            this.state.blocksLayoutPending !== nextState.blocksLayoutPending
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
          || (this.props.robbo_settings.is_copter_sim_activated !== prevProps.robbo_settings.is_copter_sim_activated)
          || (this.props.isRobboUiHidden !== prevProps.isRobboUiHidden)   ){

          const dynamicBlocksXML = this.props.vm.runtime.getBlocksXML();
          const target = this.props.vm.editingTarget;

          var config = {};
          config.isExternalSensorsActivated = this.props.robbo_settings.is_lab_ext_enabled;
          config.isExtensionPackActivated   = this.props.extension_pack.is_extension_pack_activated;
          config.robot_is_scratchduino      = this.props.robbo_settings.robot_is_scratchduino;
          config.is_sim_activated           = this.props.robbo_settings.is_sim_activated;
          config.is_copter_sim_activated    = this.props.robbo_settings.is_copter_sim_activated;
          config.robbo_ui_hidden            = this.props.isRobboUiHidden;
          config.locale = this.props.locale;
          config.messages = this.props.messages;
          const toolboxXML = makeToolboxXML(target.isStage, target.id, config, dynamicBlocksXML);

          this.props.updateToolboxState(toolboxXML);

        }

        if (!this.props.isShowingProject && prevProps.isShowingProject) {
            this._pendingInitialWorkspaceCenter = true;
        }

        if (this.props.isShowingProject && !prevProps.isShowingProject) {
            this.setState({workspaceMetrics: {}});
            if (this._pendingInitialWorkspaceCenter) {
                this.beginInitialWorkspaceLayout();
            }
        }

        if (this.props.isShowingProject && !prevProps.isShowingProject &&
            this.props.paletteCollapsed) {
            this.ensureFlyoutBlocksLayoutThenCollapse();
        }

        if (this.props.paletteCollapsed !== prevProps.paletteCollapsed &&
            !this.state.paletteAnimating) {
            if (this.props.paletteCollapsed && !prevProps.paletteCollapsed) {
                // After animated collapse _paletteCollapsed is already true; running
                // ensureFlyoutBlocksLayoutThenCollapse would open the flyout and skip hide.
                if (!this._paletteCollapsed) {
                    this.ensureFlyoutBlocksLayoutThenCollapse();
                }
            } else {
                this.updatePaletteVisibility(this.props.paletteCollapsed);
            }
        }

        if (this.props.blocksPaletteFlyoutWidth !== prevProps.blocksPaletteFlyoutWidth &&
            !this.state.paletteAnimating &&
            !this._paletteResizing) {
            this.applyPaletteFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
        }

        if (this.props.isVisible === prevProps.isVisible) {
            if (this.props.stageSize !== prevProps.stageSize ||
                this.props.isRightPanelHidden !== prevProps.isRightPanelHidden) {
                // force workspace to redraw for the new stage size / right panel width
                window.dispatchEvent(new Event('resize'));
                if (this.props.paletteCollapsed) {
                    this.scheduleFlyoutLayoutRepair();
                }
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

            if (this.props.paletteCollapsed) {
                this.scheduleFlyoutLayoutRepair();
            } else {
                window.dispatchEvent(new Event('resize'));
            }
        } else {
            this.workspace.setVisible(false);
        }
    }
    componentWillUnmount () {
        this.detachVM();
        this.workspace.dispose();
        clearTimeout(this.toolboxUpdateTimeout);
        clearTimeout(this._paletteAnimationTimer);
        clearTimeout(this._workspaceLayoutPendingTimeout);
        if (this._flyoutLayoutRepairFrame) {
            cancelAnimationFrame(this._flyoutLayoutRepairFrame);
            this._flyoutLayoutRepairFrame = null;
        }
        if (this._workspaceScrollCenterFrame) {
            cancelAnimationFrame(this._workspaceScrollCenterFrame);
            this._workspaceScrollCenterFrame = null;
        }
        this.cancelFlyoutSlideAnimation();
        this._paletteResizing = false;
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

        if (this.props.paletteCollapsed) {
            this.repairFlyoutBlockLayout(true);
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
            config.robbo_ui_hidden            = this.props.isRobboUiHidden;
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
        if (this._pendingInitialWorkspaceCenter) {
            this.beginInitialWorkspaceLayout();
        }

        // When we change sprites, update the toolbox to have the new sprite's blocks
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }

        const targetId = this.props.vm.editingTarget && this.props.vm.editingTarget.id;
        const savedMetrics = targetId ? this.state.workspaceMetrics[targetId] : null;

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

        if (savedMetrics) {
            const {scrollX, scrollY, scale} = savedMetrics;
            this.workspace.scrollX = scrollX;
            this.workspace.scrollY = scrollY;
            this.workspace.scale = scale;
            this.workspace.resize();
            if (this._pendingInitialWorkspaceCenter) {
                this.finishInitialWorkspaceLayout();
            }
        } else {
            this.workspace.resize();
            if (this._pendingInitialWorkspaceCenter) {
                if (!this.props.paletteCollapsed) {
                    this.runInitialWorkspaceCenter();
                }
            } else {
                this.tryCenterWorkspaceView();
            }
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
                // populate_ / updateToolbox call setSelectedItem(..., false) — not a user click
                const shouldExpandPalette = opt_shouldScroll !== false;
                if (shouldExpandPalette) {
                    blocks.expandPaletteThen(() => {
                        originalSetSelectedItem(item, opt_shouldScroll);
                    });
                    return;
                }
                originalSetSelectedItem(item, opt_shouldScroll);
                return;
            }
            originalSetSelectedItem(item, opt_shouldScroll);
        };

        const originalSetSelectedCategoryById = toolbox.setSelectedCategoryById.bind(toolbox);
        toolbox.setSelectedCategoryById = id => {
            if (blocks._paletteCollapsed && blocks.props.paletteCollapsed &&
                !blocks.state.paletteAnimating) {
                originalSetSelectedCategoryById(id);
                return;
            }
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

        this.setPaletteAnimating(true);
        this.runPaletteAnimation(false, () => {
            if (this.props.onTogglePalette && this.props.paletteCollapsed) {
                this.props.onTogglePalette(false);
            }
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
        this.setFlyoutScrollbarVisible(!this._paletteCollapsed);
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
    setFlyoutSlideTransform (flyout, x, y) {
        if (!flyout || !flyout.svgGroup_) {
            return;
        }
        const group = flyout.svgGroup_;
        group.style.transform = `translate(${x}px, ${y}px)`;
        group.style.webkitTransform = group.style.transform;
    }
    syncFlyoutSlideBackground (flyout, x, y) {
        if (!flyout || !flyout.svgBackground_) {
            return;
        }
        flyout.svgBackground_.style.transform = `translate(${x}px, ${y}px)`;
        flyout.svgBackground_.style.webkitTransform = flyout.svgBackground_.style.transform;
    }
    syncPaletteChromeFlyoutWidth (flyoutX) {
        const flyout = this.getToolboxFlyout();
        const flyoutWidth = this._savedFlyoutWidth ||
            (flyout && flyout.getWidth()) ||
            DEFAULT_FLYOUT_WIDTH;
        const displayWidth = Math.max(0, Math.round(flyoutX + flyoutWidth - CATEGORY_MENU_WIDTH));
        if (this.blocks) {
            this.blocks.style.setProperty('--blocks-flyout-width', `${displayWidth}px`);
        }
        return displayWidth;
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
            const eased = easeInOutCubic(t);
            const x = fromX + ((toX - fromX) * eased);
            this.setFlyoutSlideTransform(flyout, x, y);
            this.syncFlyoutSlideBackground(flyout, x, y);
            this.syncPaletteChromeFlyoutWidth(x);

            if (t < 1) {
                this._flyoutAnimationFrame = requestAnimationFrame(step);
            } else {
                this._flyoutAnimationFrame = null;
                if (onComplete) {
                    onComplete();
                }
            }
        };

        this.setFlyoutSlideTransform(flyout, fromX, y);
        this.syncFlyoutSlideBackground(flyout, fromX, y);
        this.syncPaletteChromeFlyoutWidth(fromX);
        this._flyoutAnimationFrame = requestAnimationFrame(step);
    }
    clearFlyoutSlideStyles (flyout) {
        if (!flyout || !flyout.svgGroup_) {
            return;
        }
        flyout.svgGroup_.style.transition = '';
        flyout.svgGroup_.style.opacity = '';
        flyout.svgGroup_.style.transform = '';
        flyout.svgGroup_.style.webkitTransform = '';
        if (flyout.svgBackground_) {
            flyout.svgBackground_.style.transition = '';
            flyout.svgBackground_.style.transform = '';
            flyout.svgBackground_.style.webkitTransform = '';
            flyout.svgBackground_.style.opacity = '';
        }
    }
    setPaletteAnimating (animating) {
        this.setState({paletteAnimating: animating});
    }
    setFlyoutScrollbarVisible (visible) {
        const flyout = this.getToolboxFlyout();
        if (flyout && flyout.scrollbar_ && flyout.scrollbar_.outerSvg_) {
            flyout.scrollbar_.outerSvg_.setAttribute('display', visible ? 'block' : 'none');
        }
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
    beginHiddenFlyoutRepair (root, flyout) {
        if (root) {
            root.classList.add('flyout-palette-repairing');
            root.classList.remove('flyout-palette-collapsed');
        }
        if (flyout && flyout.svgGroup_) {
            flyout.svgGroup_.style.display = 'block';
        }
        if (flyout && flyout.svgBackground_) {
            flyout.svgBackground_.style.display = 'block';
        }
        this.setFlyoutScrollbarVisible(false);
    }
    endHiddenFlyoutRepair (root) {
        if (root) {
            root.classList.remove('flyout-palette-repairing');
        }
    }
    compensateWorkspaceScrollForToolboxWidthChange (prevWidth, nextWidth, options) {
        if (!this.workspace || prevWidth === nextWidth) {
            return;
        }
        // Keep blocks at the same on-screen position when toolbox/flyout width changes.
        this.workspace.scrollX -= (nextWidth - prevWidth);
        if (!(options && options.skipMetricsUpdate)) {
            this.onWorkspaceMetricsChange();
        }
    }
    setToolboxLayoutWidth (toolbox, nextWidth, options) {
        if (!toolbox) {
            return nextWidth;
        }
        const prevWidth = toolbox.width;
        if (prevWidth === nextWidth) {
            return prevWidth;
        }
        toolbox.width = nextWidth;
        if (!(options && options.skipScrollCompensation)) {
            this.compensateWorkspaceScrollForToolboxWidthChange(prevWidth, nextWidth, options);
        }
        return prevWidth;
    }
    syncBlocklyAfterPaletteLayoutChange (fullSvgResize) {
        if (!this.workspace) {
            return;
        }
        if (fullSvgResize) {
            this.ScratchBlocks.svgResize(this.workspace);
        } else {
            this.workspace.resize();
        }
    }
    applyPaletteFlyoutWidth (flyoutWidth, options) {
        const fullSvgResize = !(options && options.fullSvgResize === false);
        const width = clampFlyoutWidth(flyoutWidth);
        const toolbox = this.workspace && this.workspace.toolbox_;
        const flyout = this.getToolboxFlyout();
        if (!toolbox || !flyout) {
            return width;
        }

        this._savedFlyoutWidth = width;
        this._savedToolboxWidth = CATEGORY_MENU_WIDTH + width;

        if (this.blocks) {
            const displayWidth = this._paletteCollapsed ? 0 : width;
            this.blocks.style.setProperty('--blocks-flyout-width', `${displayWidth}px`);
        }

        if (!this._paletteCollapsed) {
            flyout.DEFAULT_WIDTH = width;
            this.setToolboxLayoutWidth(toolbox, this._savedToolboxWidth);
            toolbox.position();
            this.syncBlocklyAfterPaletteLayoutChange(fullSvgResize);
        }

        return width;
    }
    handlePaletteResizePointerDown (e) {
        if (this.props.paletteCollapsed || this.state.paletteAnimating) {
            return;
        }
        e.preventDefault();
        const handle = e.currentTarget;
        if (handle.setPointerCapture) {
            handle.setPointerCapture(e.pointerId);
        }

        this._paletteResizing = true;
        this._paletteResizeStartX = getEventXY(e).x;
        this._paletteResizeStartWidth = this._savedFlyoutWidth ||
            clampFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
        this.setState({paletteResizing: true});

        const bodyStyle = document.body.style;
        const prevCursor = bodyStyle.cursor;
        const prevUserSelect = bodyStyle.userSelect;
        bodyStyle.cursor = 'ew-resize';
        bodyStyle.userSelect = 'none';

        const onPointerMove = ev => {
            const {x} = getEventXY(ev);
            const dx = x - this._paletteResizeStartX;
            const delta = this.props.isRtl ? -dx : dx;
            this.applyPaletteFlyoutWidth(this._paletteResizeStartWidth + delta, {
                fullSvgResize: false,
                skipMetricsUpdate: true
            });
        };

        const onPointerUp = ev => {
            onPointerMove(ev);
            if (handle.releasePointerCapture) {
                try {
                    handle.releasePointerCapture(e.pointerId);
                } catch (releaseError) {
                    // Pointer may already be released.
                }
            }
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            bodyStyle.cursor = prevCursor;
            bodyStyle.userSelect = prevUserSelect;
            this._paletteResizing = false;
            this.setState({paletteResizing: false});
            this.ScratchBlocks.svgResize(this.workspace);
            this.onWorkspaceMetricsChange();

            const finalWidth = this._savedFlyoutWidth ||
                clampFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
            if (this.props.onSetBlocksPaletteFlyoutWidth) {
                this.props.onSetBlocksPaletteFlyoutWidth(finalWidth);
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
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
            const flyoutWidth = clampFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
            this._savedFlyoutWidth = flyoutWidth;
            this._savedToolboxWidth = CATEGORY_MENU_WIDTH + flyoutWidth;
        }

        if (collapsed) {
            flyout.setContainerVisible(false);

            if (!this._flyoutPositionPatched) {
                this._originalFlyoutPosition = flyout.position.bind(flyout);
                flyout.position = () => {};
                this._flyoutPositionPatched = true;
            }

            this.setFlyoutDomVisible(false);
            this.setToolboxLayoutWidth(toolbox, CATEGORY_MENU_WIDTH);
        } else {
            this.restorePaletteFlyoutLayout(toolbox, flyout);
        }

        toolbox.position();
        this.syncBlocklyAfterPaletteLayoutChange(false);
    }
    ensureFlyoutBlocksLayoutAtFullWidth () {
        this.repairFlyoutBlockLayout(false);
    }
    ensureFlyoutBlocksLayoutThenCollapse () {
        this.repairFlyoutBlockLayout(true);
    }
    scheduleFlyoutLayoutRepair () {
        if (this._flyoutLayoutRepairFrame) {
            cancelAnimationFrame(this._flyoutLayoutRepairFrame);
        }
        this._flyoutLayoutRepairFrame = requestAnimationFrame(() => {
            this._flyoutLayoutRepairFrame = null;
            if (this.props.paletteCollapsed) {
                this.ensureFlyoutBlocksLayoutThenCollapse();
            } else {
                this.ensureFlyoutBlocksLayoutAtFullWidth();
            }
        });
    }
    beginInitialWorkspaceLayout () {
        if (!this._pendingInitialWorkspaceCenter) {
            return;
        }
        if (!this.state.blocksLayoutPending) {
            this.setState({blocksLayoutPending: true});
        }
        const root = this.getInjectionRoot();
        if (root) {
            root.style.visibility = 'hidden';
            this._workspaceLayoutHidden = true;
        }
        if (this.props.onBlocksWorkspaceLayoutPending) {
            this.props.onBlocksWorkspaceLayoutPending(true);
        }
        clearTimeout(this._workspaceLayoutPendingTimeout);
        this._workspaceLayoutPendingTimeout = setTimeout(() => {
            this.finishInitialWorkspaceLayout();
        }, WORKSPACE_LAYOUT_PENDING_TIMEOUT_MS);
    }
    finishInitialWorkspaceLayout () {
        if (!this._pendingInitialWorkspaceCenter) {
            return;
        }
        this._pendingInitialWorkspaceCenter = false;
        clearTimeout(this._workspaceLayoutPendingTimeout);
        this._workspaceLayoutPendingTimeout = null;
        if (this.state.blocksLayoutPending) {
            this.setState({blocksLayoutPending: false});
        }
        const root = this.getInjectionRoot();
        if (root && this._workspaceLayoutHidden) {
            root.style.visibility = '';
            this._workspaceLayoutHidden = false;
        }
        if (this.props.onBlocksWorkspaceLayoutReady) {
            this.props.onBlocksWorkspaceLayoutReady();
        }
    }
    tryCenterWorkspaceView () {
        if (!this.workspace || !this.workspace.scrollbar) {
            return false;
        }
        this.workspace.resize();
        this.workspace.scrollCenter();
        this.onWorkspaceMetricsChange();
        return true;
    }
    runInitialWorkspaceCenter () {
        const finishPending = () => {
            if (this._pendingInitialWorkspaceCenter) {
                this.finishInitialWorkspaceLayout();
            }
        };

        if (this.tryCenterWorkspaceView()) {
            finishPending();
            return;
        }
        this.scheduleWorkspaceScrollCenter(finishPending);
    }
    centerWorkspaceView () {
        this.tryCenterWorkspaceView();
    }
    scheduleWorkspaceScrollCenter (onComplete) {
        if (this._workspaceScrollCenterFrame) {
            cancelAnimationFrame(this._workspaceScrollCenterFrame);
        }
        let attempts = 0;
        const tryCenter = () => {
            attempts++;
            if (this.tryCenterWorkspaceView() || attempts >= 5) {
                this._workspaceScrollCenterFrame = null;
                if (onComplete) {
                    onComplete();
                }
                return;
            }
            this._workspaceScrollCenterFrame = requestAnimationFrame(tryCenter);
        };
        this._workspaceScrollCenterFrame = requestAnimationFrame(tryCenter);
    }
    rerenderFlyoutBlocksAtFullWidth (flyoutWorkspace) {
        if (!flyoutWorkspace || typeof flyoutWorkspace.getTopBlocks !== 'function') {
            return;
        }
        const Field = this.ScratchBlocks.Field;
        if (Field) {
            Field.cacheWidths_ = null;
            Field.cacheReference_ = 0;
        }
        flyoutWorkspace.getTopBlocks(false).forEach(block => {
            if (block && block.rendered && typeof block.render === 'function') {
                block.renderingMetrics_ = null;
                block.render(true);
            }
        });
    }
    repairFlyoutBlockLayout (rehideIfCollapsed) {
        const toolbox = this.workspace && this.workspace.toolbox_;
        const flyout = this.getToolboxFlyout();
        if (!toolbox || !flyout) {
            return;
        }

        const hiddenRepair = rehideIfCollapsed && this.props.paletteCollapsed;
        const root = this.getInjectionRoot();

        if (this._flyoutPositionPatched && this._originalFlyoutPosition) {
            flyout.position = this._originalFlyoutPosition;
            if (!hiddenRepair) {
                this._flyoutPositionPatched = false;
            }
        }

        const flyoutWidth = clampFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
        this._savedFlyoutWidth = flyoutWidth;
        this._savedToolboxWidth = CATEGORY_MENU_WIDTH + flyoutWidth;
        flyout.DEFAULT_WIDTH = flyoutWidth;

        if (hiddenRepair) {
            this.setToolboxLayoutWidth(toolbox, CATEGORY_MENU_WIDTH, {skipScrollCompensation: true});
        } else {
            this.setToolboxLayoutWidth(toolbox, this._savedToolboxWidth);
            if (root) {
                root.classList.remove('flyout-palette-collapsed');
            }
        }

        this.clearFlyoutSlideStyles(flyout);
        flyout.setContainerVisible(true);
        flyout.setVisible(true);

        if (hiddenRepair) {
            this.beginHiddenFlyoutRepair(root, flyout);
        } else {
            if (flyout.svgGroup_) {
                flyout.svgGroup_.style.display = 'block';
            }
            if (flyout.svgBackground_) {
                flyout.svgBackground_.style.display = 'block';
            }
            this.setFlyoutScrollbarVisible(true);
        }

        toolbox.position();

        const flyoutWorkspace = typeof flyout.getWorkspace === 'function' ?
            flyout.getWorkspace() : null;

        const finishBlockLayout = () => {
            this.rerenderFlyoutBlocksAtFullWidth(flyoutWorkspace);
            if (typeof flyout.reflow === 'function') {
                flyout.reflow();
            }
            if (flyout.scrollbar_ && typeof flyout.scrollbar_.resize === 'function') {
                flyout.scrollbar_.resize();
            }
            this.ScratchBlocks.svgResize(this.workspace);

            if (hiddenRepair) {
                this.endHiddenFlyoutRepair(root);
                if (this._flyoutPositionPatched && this._originalFlyoutPosition) {
                    flyout.position = () => {};
                }
                this._paletteCollapsed = false;
                this.updatePaletteVisibility(true);
                if (this.blocks) {
                    this.blocks.style.setProperty('--blocks-flyout-width', '0px');
                }
                if (this._pendingInitialWorkspaceCenter) {
                    this.runInitialWorkspaceCenter();
                }
            }
        };

        // Dropdown fields cache text widths while the flyout may be display:none or
        // at category-only toolbox width; re-measure after the flyout is in DOM (opacity 0).
        requestAnimationFrame(() => {
            requestAnimationFrame(finishBlockLayout);
        });
    }
    restorePaletteFlyoutLayout (toolbox, flyout) {
        const restoredWidth = this._savedFlyoutWidth ||
            clampFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
        this._savedFlyoutWidth = restoredWidth;
        this._savedToolboxWidth = CATEGORY_MENU_WIDTH + restoredWidth;
        this.setToolboxLayoutWidth(toolbox, this._savedToolboxWidth);
        flyout.DEFAULT_WIDTH = restoredWidth;
        if (this.blocks) {
            this.blocks.style.setProperty('--blocks-flyout-width', `${restoredWidth}px`);
        }

        if (this._flyoutPositionPatched) {
            flyout.position = this._originalFlyoutPosition;
            this._flyoutPositionPatched = false;
        }

        flyout.setContainerVisible(true);
        flyout.setVisible(true);
        flyout.svgGroup_.style.display = 'block';
        if (flyout.svgBackground_) {
            flyout.svgBackground_.style.display = 'block';
        }

        const root = this.getInjectionRoot();
        if (root) {
            root.classList.remove('flyout-palette-collapsed');
        }
    }
    preparePaletteForExpandAnimation (toolbox, flyout) {
        if (this._savedToolboxWidth === undefined) {
            const flyoutWidth = clampFlyoutWidth(this.props.blocksPaletteFlyoutWidth);
            this._savedFlyoutWidth = flyoutWidth;
            this._savedToolboxWidth = CATEGORY_MENU_WIDTH + flyoutWidth;
        }

        this._paletteCollapsed = false;
        this.restorePaletteFlyoutLayout(toolbox, flyout);
        this.setFlyoutScrollbarVisible(false);
        toolbox.position();
    }
    finalizePaletteExpand (toolbox, flyout) {
        this.repairFlyoutBlockLayout(false);
        if (flyout.scrollbar_ && typeof flyout.scrollbar_.resize === 'function') {
            flyout.scrollbar_.resize();
        }
    }
    runPaletteAnimation (collapsed, onComplete) {
        const toolbox = this.workspace && this.workspace.toolbox_;
        const flyout = this.getToolboxFlyout();
        const finish = () => {
            this.setPaletteAnimating(false);
            const chromeWidth = this._paletteCollapsed ?
                0 :
                (this._savedFlyoutWidth || DEFAULT_FLYOUT_WIDTH);
            if (this.blocks) {
                this.blocks.style.setProperty('--blocks-flyout-width', `${chromeWidth}px`);
            }
            this.setFlyoutScrollbarVisible(!this._paletteCollapsed);
            if (onComplete) {
                onComplete();
            }
        };

        if (!toolbox || !flyout) {
            this.updatePaletteVisibility(collapsed);
            finish();
            return;
        }

        this.setFlyoutScrollbarVisible(false);

        toolbox.position();
        const {x: startX} = this.parseFlyoutTranslate(flyout);
        const flyoutWidth = this._savedFlyoutWidth || flyout.getWidth() || DEFAULT_FLYOUT_WIDTH;
        const isRtl = this.props.isRtl;
        const slideOffset = isRtl ? flyoutWidth : -flyoutWidth;

        if (collapsed) {
            this.syncPaletteChromeFlyoutWidth(startX);
            this.animateFlyoutSlide(flyout, startX, startX + slideOffset, () => {
                this.clearFlyoutSlideStyles(flyout);
                this.updatePaletteVisibility(true);
                finish();
            });
            return;
        }

        this.preparePaletteForExpandAnimation(toolbox, flyout);
        const {x: targetX, y: targetY} = this.parseFlyoutTranslate(flyout);
        const fromX = targetX + slideOffset;

        this.syncPaletteChromeFlyoutWidth(fromX);
        this.setFlyoutSlideTransform(flyout, fromX, targetY);
        this.syncFlyoutSlideBackground(flyout, fromX, targetY);
        requestAnimationFrame(() => {
            this.animateFlyoutSlide(flyout, fromX, targetX, () => {
                this.finalizePaletteExpand(toolbox, flyout);
                finish();
            });
        });
    }
    handleTogglePalette () {
        if (this.state.paletteAnimating) {
            return;
        }
        const nextCollapsed = !this.props.paletteCollapsed;

        this.setPaletteAnimating(true);
        this.runPaletteAnimation(nextCollapsed, () => {
            if (this.props.onTogglePalette) {
                this.props.onTogglePalette(nextCollapsed);
            }
        });
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
            blocksPaletteFlyoutWidth,
            onSetBlocksPaletteFlyoutWidth,
            isRightPanelHidden,
            isBlocksWorkspaceLayoutPending,
            isShowingProject,
            onBlocksWorkspaceLayoutPending,
            onBlocksWorkspaceLayoutReady,
            locale,
            messages,
            extension_pack,
            robbo_settings,
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
                    layoutPending={isBlocksWorkspaceLayoutPending || this.state.blocksLayoutPending}
                    paletteCollapsed={paletteCollapsed}
                    paletteAnimating={this.state.paletteAnimating}
                    paletteResizing={this.state.paletteResizing}
                    paletteResizeDisabled={paletteCollapsed || this.state.paletteAnimating}
                    paletteToggleTitle={paletteToggleTitle}
                    onTogglePalette={this.handleTogglePalette}
                    onPaletteResizePointerDown={this.handlePaletteResizePointerDown}
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
    isShowingProject: PropTypes.bool,
    paletteToggleTitle: PropTypes.string,
    onTogglePalette: PropTypes.func, // (collapsed: boolean) => void
    blocksPaletteFlyoutWidth: PropTypes.number,
    onSetBlocksPaletteFlyoutWidth: PropTypes.func,
    onBlocksWorkspaceLayoutPending: PropTypes.func,
    onBlocksWorkspaceLayoutReady: PropTypes.func,
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
    blocksPaletteFlyoutWidth: BLOCKS_PALETTE_FLYOUT_WIDTH_DEFAULT,
    options: Blocks.defaultOptions
};

const mapStateToProps = state => ({
    isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
    isRightPanelHidden: state.scratchGui.layoutVisibility.isRightPanelHidden,
    isRobboUiHidden: state.scratchGui.layoutVisibility.isRobboUiHidden,
    isBlocksWorkspaceLayoutPending: state.scratchGui.layoutVisibility.isBlocksWorkspaceLayoutPending,
    blocksPaletteFlyoutWidth: state.scratchGui.layoutVisibility.blocksPaletteFlyoutWidth,
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
    },
    onBlocksWorkspaceLayoutPending: isPending => {
        dispatch(setBlocksWorkspaceLayoutPending(isPending));
    },
    onBlocksWorkspaceLayoutReady: () => {
        dispatch(setBlocksWorkspaceLayoutPending(false));
    }
});

export default errorBoundaryHOC('Blocks')(
    connect(
        mapStateToProps,
        mapDispatchToProps
    )(Blocks)
);
