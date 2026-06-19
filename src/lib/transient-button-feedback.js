import React from 'react';

export const TRANSIENT_BUTTON_FEEDBACK_MS = 2000;

/**
 * Brief success label on action buttons (copy / save / apply).
 * @param {import('react').Component} component
 * @param {{ stateKey: string, feedbackToken?: string, durationMs?: number, timerField?: string }} options
 */
export function showTransientButtonFeedback (component, {
  stateKey,
  feedbackToken = 'done',
  durationMs = TRANSIENT_BUTTON_FEEDBACK_MS,
  timerField
}) {
  const timerKey = timerField || `_transientFeedbackTimer_${stateKey}`;

  if (component[timerKey]) {
    clearTimeout(component[timerKey]);
  }

  component.setState({[stateKey]: feedbackToken});

  component[timerKey] = setTimeout(() => {
    component[timerKey] = null;
    component.setState(prevState => (
      prevState[stateKey] === feedbackToken ? {[stateKey]: null} : null
    ));
  }, durationMs);
}

export function clearTransientButtonFeedbackTimer (component, stateKey, timerField) {
  const timerKey = timerField || `_transientFeedbackTimer_${stateKey}`;
  if (component[timerKey]) {
    clearTimeout(component[timerKey]);
    component[timerKey] = null;
  }
}

export function isTransientButtonFeedbackActive (state, stateKey, feedbackToken = 'done') {
  return state[stateKey] === feedbackToken;
}

/**
 * @param {object} params
 * @param {boolean} params.feedbackActive
 * @param {object} params.defaultMessage react-intl descriptor
 * @param {object} params.successMessage react-intl descriptor
 * @param {import('react-intl').IntlShape} params.intl
 * @param {string} params.labelClassName CSS module class for label span
 */
export function renderTransientActionLabel ({
  feedbackActive,
  defaultMessage,
  successMessage,
  intl,
  labelClassName
}) {
  return (
    <span
      key={feedbackActive ? 'feedback' : 'default'}
      className={labelClassName}
    >
      {intl.formatMessage(feedbackActive ? successMessage : defaultMessage)}
    </span>
  );
}
