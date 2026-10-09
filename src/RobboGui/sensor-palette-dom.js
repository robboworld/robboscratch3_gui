/**
 * Value span: telemetry_row → … → telemetry_value_group → telemetry_value (last column).
 * With control: telemetry_control_leading | telemetry_label | telemetry_value_group.
 * @param {HTMLElement|null} sensorRoot element with id *_sensor-* or *_sensor-data-block-*
 * @returns {HTMLElement|null}
 */
export function getPaletteSensorValueNode (sensorRoot) {
  if (!sensorRoot || !sensorRoot.children.length) {
    return null;
  }
  const row = sensorRoot.children[0];
  if (!row || !row.children.length) {
    return null;
  }
  const valueGroup = row.children[row.children.length - 1];
  if (!valueGroup || !valueGroup.children.length) {
    return null;
  }
  return valueGroup.children[0];
}

/**
 * @param {HTMLElement|null} valueEl
 * @param {string} colorClassName CSS module class for color swatch mode
 */
export function setPaletteSensorTextValue (valueEl, text, colorClassName) {
  if (!valueEl) {
    return;
  }
  if (colorClassName) {
    valueEl.classList.remove(colorClassName);
  }
  valueEl.style.removeProperty('--sensor-color');
  valueEl.removeAttribute('title');
  valueEl.textContent = text == null ? '---' : String(text);
}

/**
 * @param {HTMLElement|null} valueEl
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {string} colorClassName CSS module class for color swatch mode
 * @param {string} [label] colour name shown next to the swatch
 */
export function setPaletteSensorColorValue (valueEl, r, g, b, colorClassName, label) {
  if (!valueEl || !colorClassName) {
    return;
  }
  valueEl.classList.add(colorClassName);
  valueEl.style.setProperty('--sensor-color', `rgb(${r},${g},${b})`);
  valueEl.textContent = label || '';
  valueEl.title = `R ${r} · G ${g} · B ${b}`;
}
