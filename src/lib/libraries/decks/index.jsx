import React from 'react';
import {FormattedMessage} from 'react-intl';

/**
 * Demo how-to decks that showcase tutorial UI features.
 * Full Scratch tutorial set is preserved (not loaded) in:
 *   ./index.scratch-original.jsx
 */

import libraryIntro from './intro/lib-getting-started.jpg';
import stepMove from './intro/intro1.gif';
import stepMoveSayHello from './intro/intro2.gif';

import libraryAddSprite from './sprite/cover-add-sprite.jpg';
import stepAddSprite from './sprite/intro-choose-sprite.gif';

import addBackdropThumb from './videos/add-backdrop.jpg';
import changeSizeThumb from './videos/change-size.jpg';

export default {

    'demo-image-steps': {
        name: (
            <FormattedMessage
                defaultMessage="Demo: image steps"
                description="Demo tutorial that shows GIF/image steps"
                id="gui.howtos.demo-image-steps.name"
            />
        ),
        tags: ['animation', 'help', 'demo'],
        img: libraryIntro,
        steps: [{
            title: (
                <FormattedMessage
                    defaultMessage="Step with a GIF"
                    description="Demo: first image step title"
                    id="gui.howtos.demo-image-steps.step_gif"
                />
            ),
            image: stepMove
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Another image step"
                    description="Demo: second image step title"
                    id="gui.howtos.demo-image-steps.step_next"
                />
            ),
            image: stepMoveSayHello
        }, {
            deckIds: [
                'demo-video-step',
                'demo-related'
            ]
        }],
        urlId: 'demo-image-steps'
    },

    'demo-video-step': {
        name: (
            <FormattedMessage
                defaultMessage="Demo: video step"
                description="Demo tutorial that starts with a Wistia video"
                id="gui.howtos.demo-video-step.name"
            />
        ),
        tags: ['games', 'help', 'demo'],
        img: addBackdropThumb,
        steps: [{
            video: 'intro-move-sayhello'
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="After the video — try this"
                    description="Demo: step after video"
                    id="gui.howtos.demo-video-step.step_after"
                />
            ),
            image: stepAddSprite
        }, {
            deckIds: [
                'demo-image-steps',
                'demo-related'
            ]
        }],
        urlId: 'demo-video-step'
    },

    'demo-related': {
        name: (
            <FormattedMessage
                defaultMessage="Demo: related tutorials"
                description="Demo tutorial that links to other decks at the end"
                id="gui.howtos.demo-related.name"
            />
        ),
        tags: ['art', 'help', 'demo'],
        img: libraryAddSprite,
        steps: [{
            title: (
                <FormattedMessage
                    defaultMessage="Short tip with an image"
                    description="Demo: single tip step"
                    id="gui.howtos.demo-related.step_tip"
                />
            ),
            image: stepAddSprite
        }, {
            title: (
                <FormattedMessage
                    defaultMessage="Last step — then related cards"
                    description="Demo: last tip before related decks"
                    id="gui.howtos.demo-related.step_last"
                />
            ),
            image: changeSizeThumb
        }, {
            deckIds: [
                'demo-image-steps',
                'demo-video-step'
            ]
        }],
        urlId: 'demo-related'
    }
};
