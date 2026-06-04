import classNames from 'classnames';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import formStyles from './RobboPaletteForm.css';
import styles from './RobboSelect.css';

/**
 * Custom list styling; keeps a hidden native <select> as first child for
 * SettingsWindowComponent getInput() / .value assignment.
 */
export default class RobboSelect extends Component {
  constructor (props) {
    super(props);
    this.state = {
      open: false,
      syncRevision: 0,
      listPosition: null
    };
    this.rootRef = React.createRef();
    this.triggerRef = React.createRef();
    this.selectRef = React.createRef();
    this.onDocumentMouseDown = this.onDocumentMouseDown.bind(this);
    this.onNativeSelectChange = this.onNativeSelectChange.bind(this);
    this.onNativeSelectSync = this.onNativeSelectSync.bind(this);
    this.updateListPosition = this.updateListPosition.bind(this);
  }

  componentDidMount () {
    document.addEventListener('mousedown', this.onDocumentMouseDown);
    window.addEventListener('resize', this.updateListPosition);
    window.addEventListener('scroll', this.updateListPosition, true);
    const select = this.selectRef.current;
    if (select) {
      select.addEventListener('change', this.onNativeSelectChange);
      select.addEventListener('robbo-select-sync', this.onNativeSelectSync);
    }
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    window.removeEventListener('resize', this.updateListPosition);
    window.removeEventListener('scroll', this.updateListPosition, true);
    const select = this.selectRef.current;
    if (select) {
      select.removeEventListener('change', this.onNativeSelectChange);
      select.removeEventListener('robbo-select-sync', this.onNativeSelectSync);
    }
    if (this._measureEl && this._measureEl.parentNode) {
      this._measureEl.parentNode.removeChild(this._measureEl);
      this._measureEl = null;
    }
  }

  componentDidUpdate (_prevProps, prevState) {
    if (this.state.open && !prevState.open) {
      this.updateListPosition();
    }
  }

  onDocumentMouseDown (event) {
    const root = this.rootRef.current;
    const listNode = this.listPortalRef;
    if (
      (root && root.contains(event.target)) ||
      (listNode && listNode.contains(event.target))
    ) {
      return;
    }
    this.setState({ open: false });
  }

  onNativeSelectChange () {
    this.setState({ syncRevision: this.state.syncRevision + 1 });
    const select = this.selectRef.current;
    if (this.props.onChange && select) {
      this.props.onChange({ target: { value: select.value } });
    }
  }

  onNativeSelectSync () {
    this.setState({ syncRevision: this.state.syncRevision + 1 });
  }

  measureListContentWidth () {
    const { options } = this.props;
    if (!options || !options.length) {
      return 0;
    }

    if (!this._measureEl) {
      this._measureEl = document.createElement('span');
      this._measureEl.className = styles.measureOption;
      this._measureEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this._measureEl);
    }

    let maxTextWidth = 0;
    options.forEach(opt => {
      this._measureEl.textContent = opt.label;
      maxTextWidth = Math.max(maxTextWidth, this._measureEl.offsetWidth);
    });

    /* horizontal padding of .option (0.625rem × 2) + small slack */
    return maxTextWidth + 24;
  }

  getListAnchorElement () {
    const { listAnchorId } = this.props;
    if (listAnchorId && typeof document !== 'undefined') {
      return document.getElementById(listAnchorId);
    }
    return this.triggerRef.current;
  }

  getListAnchorRect () {
    const anchorEl = this.getListAnchorElement();
    if (!anchorEl) {
      return null;
    }
    const anchorRect = anchorEl.getBoundingClientRect();
    const contentWidth = this.measureListContentWidth();
    const minWidth = 8.5 * 16; /* ~8.5rem */
    let width = Math.max(Math.ceil(anchorRect.width), contentWidth, minWidth);

    const isRtl =
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('dir') === 'rtl';

    let left;
    if (isRtl) {
      left = anchorRect.left;
    } else {
      left = anchorRect.right - width;
    }

    const triggerRect = this.triggerRef.current
      ? this.triggerRef.current.getBoundingClientRect()
      : anchorRect;

    if (!this.props.listAnchorId) {
      const fieldControl = this.rootRef.current && this.rootRef.current.parentElement;
      const fieldRow = fieldControl && fieldControl.parentElement;
      if (fieldRow && typeof fieldRow.getBoundingClientRect === 'function') {
        const rowRect = fieldRow.getBoundingClientRect();
        if (left < rowRect.left) {
          left = rowRect.left;
          width = triggerRect.right - left;
        }
      }
    } else {
      const viewportPad = 8;
      const maxLeft = window.innerWidth - width - viewportPad;
      if (left > maxLeft) {
        left = Math.max(viewportPad, maxLeft);
      }
      if (left < viewportPad) {
        left = viewportPad;
      }
    }

    const maxHeight = this.props.listMaxHeightPx
      ? Number(this.props.listMaxHeightPx)
      : null;

    return {
      top: anchorRect.bottom + 2,
      left,
      width,
      maxHeight
    };
  }

  updateListPosition () {
    if (!this.state.open || !this.triggerRef.current) {
      return;
    }
    this.setState({
      listPosition: this.getListAnchorRect()
    });
  }

  getCurrentValue () {
    const select = this.selectRef.current;
    if (select) {
      return select.value;
    }
    return this.props.defaultValue != null ? String(this.props.defaultValue) : '';
  }

  selectOption (value) {
    const select = this.selectRef.current;
    if (!select) {
      return;
    }
    select.value = String(value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    this.setState({ open: false, syncRevision: this.state.syncRevision + 1 });
  }

  toggleOpen () {
    this.setState(prev => ({ open: !prev.open }));
  }

  renderList () {
    const { options } = this.props;
    const { listPosition } = this.state;
    if (!listPosition) {
      return null;
    }

    const currentValue = this.getCurrentValue();

    const list = (
      <ul
        ref={node => {
          this.listPortalRef = node;
        }}
        className={classNames(
          styles.list,
          listPosition.maxHeight && styles.listScrollable
        )}
        role="listbox"
        style={{
          position: 'fixed',
          top: listPosition.top,
          left: listPosition.left,
          width: listPosition.width,
          maxHeight: listPosition.maxHeight || undefined,
          right: 'auto'
        }}
      >
        {options.map(opt => {
          const isSelected = String(opt.value) === String(currentValue);
          return (
            <li
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              className={classNames(
                styles.option,
                isSelected && styles.optionSelected
              )}
              onMouseDown={event => {
                event.preventDefault();
                this.selectOption(opt.value);
              }}
            >
              {opt.label}
            </li>
          );
        })}
      </ul>
    );

    if (typeof document !== 'undefined' && document.body) {
      return ReactDOM.createPortal(list, document.body);
    }
    return list;
  }

  render () {
    const { options, defaultValue, className, id, triggerAriaLabel } = this.props;
    void this.state.syncRevision;

    const currentValue = this.getCurrentValue();
    const selected = options.find(
      opt => String(opt.value) === String(currentValue)
    );

    return (
      <div
        ref={this.rootRef}
        className={classNames(styles.root, className)}
      >
        <select
          ref={this.selectRef}
          id={id}
          className={styles.nativeSelect}
          defaultValue={defaultValue}
          tabIndex={-1}
          aria-hidden="true"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          ref={this.triggerRef}
          type="button"
          className={classNames(formStyles.field_select_trigger, styles.trigger)}
          aria-haspopup="listbox"
          aria-expanded={this.state.open}
          aria-label={triggerAriaLabel}
          onClick={() => this.toggleOpen()}
        >
          <span className={styles.triggerLabel}>
            {selected ? selected.label : ''}
          </span>
          <span className={styles.caret} aria-hidden="true" />
        </button>

        {this.state.open ? this.renderList() : null}
      </div>
    );
  }
}

/** Call after imperative .value on the hidden select (Settings load). */
export function syncRobboSelectFromNative (selectElement) {
  if (selectElement) {
    selectElement.dispatchEvent(new CustomEvent('robbo-select-sync', { bubbles: true }));
  }
}
