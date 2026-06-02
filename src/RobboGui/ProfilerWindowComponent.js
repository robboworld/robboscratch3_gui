import classNames from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withAlert } from 'react-alert';

import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';

import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './ProfilerWindowComponent.css';
import {ActionTriggerNewDraggableWindow} from './actions/sensor_actions';


const messages = defineMessages({

    profiler_window: {
        id: 'gui.RobboGui.profiler_window',
        description: ' ',
        defaultMessage: 'Profiler'
    }

  });

class ProfilerWindowComponent extends Component {

  // constructor(){
  //
  //     super();
  //
  // }


  onThisWindowClose(){

    console.log("ProfilerWindow close");
    this.props.onProfilerWindowClose("profiler-window");

  }

  componentDidMount(){

  

  }

  render() {



  return (

    <div id="profiler-window" className={classNames(sharedStyles.palette, styles.profiler_window)}>


          <div id="profiler-window-tittle" className={sharedStyles.header}>
            <span className={sharedStyles.headerTitle}>
              {this.props.intl.formatMessage(messages.profiler_window)}
            </span>
            <button
              type="button"
              className={sharedStyles.closeButton}
              aria-label="Close"
              onClick={this.onThisWindowClose.bind(this)}
            />
          </div>

           <div id="profiler-window-content" className={classNames(sharedStyles.body, formStyles.palette_content)}>

                <section className={formStyles.section}>
                <div id="profiler-window-content-hat" className={styles.profiler_window_content_hat}>

                    <div id="profiler-window-content-hat-element-1" className={styles.profiler_window_content_hat_element}>{"Id"} </div> 

                    <div id="profiler-window-content-hat-element-2" className={styles.profiler_window_content_hat_element}>{"Total time"} </div> 

                    <div id="profiler-window-content-hat-element-3" className={styles.profiler_window_content_hat_element}>{"Self time"} </div> 

                </div> 

                <div id="profiler-window-average-time" className={styles.profiler_window_average_time}>



                </div> 

                <div id="profiler-window-content-body" className={styles.profiler_window_content_body}>



                </div>
                </section>

           </div>


      </div>


  )

};


}

const mapStateToProps =  state => ({





  });

const mapDispatchToProps = dispatch => ({

  onProfilerWindowClose: (window_id) => {

      dispatch(ActionTriggerNewDraggableWindow(window_id));
    }


});





export default injectIntl(connect(
  mapStateToProps,
  mapDispatchToProps
)(ProfilerWindowComponent));
