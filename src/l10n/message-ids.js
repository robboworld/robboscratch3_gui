/**
 * Canonical React-Intl message ids for Robbo GUI (must exist in robboscratch3_I10n/editor/interface/en.json).
 * In defineMessages(), ids must remain string literals (babel-plugin-react-intl); keep values in sync with this file.
 * Run: npm run audit:gui-ids (from robboscratch3_I10n).
 */
export const RobboMessageIds = {
    settingsWindow: {
        fullscreenSectionTitle: 'gui.RobboGui.settings_window.fullscreen_section_title',
        fullscreenRenderQuality: 'gui.RobboGui.settings_window.fullscreen_render_quality',
        fullscreenRenderQualityHint: 'gui.RobboGui.settings_window.fullscreen_quality_note',
        fullscreenQualityPerformance: 'gui.RobboGui.settings_window.fullscreen_quality_performance',
        fullscreenQualityBalanced: 'gui.RobboGui.settings_window.fullscreen_quality_balanced',
        fullscreenQualityQuality: 'gui.RobboGui.settings_window.fullscreen_quality_quality'
    },
    dca: {
        deviceConnectionSection: 'gui.dca.device_connection_section'
    }
};
