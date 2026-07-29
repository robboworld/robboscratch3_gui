import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import Button from '../button/button.jsx';

import projectPageIcon from './icon--project-page.svg';
import styles from './community-button.css';

const CommunityButton = ({
    className,
    onClick
}) => (
    <Button
        className={classNames(
            className,
            styles.communityButton
        )}
        iconClassName={styles.communityButtonIcon}
        iconSrc={projectPageIcon}
        onClick={onClick}
    >
        <FormattedMessage
            defaultMessage="Project page"
            description="Label for button that opens the project page in the personal account"
            id="gui.menuBar.seeProjectPage"
        />
    </Button>
);

CommunityButton.propTypes = {
    className: PropTypes.string,
    onClick: PropTypes.func
};

CommunityButton.defaultProps = {
    onClick: () => {}
};

export default CommunityButton;
