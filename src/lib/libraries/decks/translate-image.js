/**
 * @fileoverview
 * Utility functions for handling tutorial images in multiple languages.
 *
 * Robbo: Scratch's per-locale tutorial screenshots (13 languages, no Russian, ~59 MB) were removed along with
 * the Scratch decks. Robbo lessons pass the imported image URL directly as `step.image`. To localize screenshots
 * later, map locale -> {imageId: url} in `translations` (upstream example: `git show c6e42f3:<this file>`).
 */

const translations = {};

let savedImages = {};
let savedLocale = '';

const loadImageData = locale => {
    if (Object.prototype.hasOwnProperty.call(translations, locale)) {
        translations[locale]()
            .then(newImages => {
                savedImages = newImages;
                savedLocale = locale;
            });
    }
};

/**
 * Return image data for tutorials based on locale
 * @param {string} imageId key in the images object, or the image URL itself.
 * @param {string} locale requested locale
 * @return {string} image
 */
const translateImage = (imageId, locale) => {
    if (locale === savedLocale && Object.prototype.hasOwnProperty.call(savedImages, imageId)) {
        return savedImages[imageId];
    }
    return imageId;
};

export {
    loadImageData,
    translateImage
};
