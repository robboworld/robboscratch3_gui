import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import styles from './QuadcopterPreviewComponent.css'
import { ActionTriggerDraggableWindow } from './actions/sensor_actions'

class QuadcopterPreviewComponent extends Component {
  constructor (props) {
    super(props);
    this.state = {
      quadcopterState: 'disconnected',
      quadcopterSearching: false
    };
  }

  onQuadcopterStatusChange(quadcopter_state, quadcopter_is_searching, statusSnapshot) {
    const snapshot = statusSnapshot || {};
    this.setState({
      quadcopterState: snapshot.state || quadcopter_state || 'disconnected',
      quadcopterSearching: snapshot.searching === true || quadcopter_is_searching === true
    });
  }

  isConnectedLikeState () {
    return ['connected', 'landing'].indexOf(this.state.quadcopterState) !== -1;
  }
  componentDidMount() {
    this._quadcopterStatusCallback = this.onQuadcopterStatusChange.bind(this);
    this.props.QCA.registerQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
  }
  componentWillUnmount() {
    if (this.props.QCA && this._quadcopterStatusCallback &&
      typeof this.props.QCA.unregisterQuadcopterStatusChangeCallback === 'function') {
      this.props.QCA.unregisterQuadcopterStatusChangeCallback(this._quadcopterStatusCallback);
    }
  }
  render() {
    const isConnected = this.isConnectedLikeState();
    return (
      <div id={`quadcopter-preview-${this.props.quadcopterIndex}`}
        className={classNames(
          { [styles.quadcopterPreview]: true },
          { [styles.quadcopter_status_connected]: isConnected },
          { [styles.quadcopter_status_disconnected]: !isConnected }
        )}
        onClick={this.props.onTriggerQuadcopterPallete}>
        <div id={`quadcopter-${this.props.quadcopterIndex}-preview-pic`} className={styles.quadcopterPreviewPic} >
        </div>
        <div id={`quadcopter-${this.props.quadcopterIndex}-connection-status`} className={classNames(
          { [styles.quadcopter_connection_status]: true },
          { [styles.quadcopter_status_connected]: isConnected },
          { [styles.quadcopter_status_disconnected]: !isConnected }
        )} >
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
});

const mapDispatchToProps = dispatch => ({
  onTriggerQuadcopterPallete: () => {
    dispatch(ActionTriggerDraggableWindow(0));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(QuadcopterPreviewComponent);
