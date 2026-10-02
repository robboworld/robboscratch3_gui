// Robbo: registry of step-by-step lessons shown as cards over the editor (menu «Руководства», ?tutorial=<urlId>).
// Scratch's own tutorials were removed: they are English-only (no Russian screenshots, Wistia videos) and
// feature the Scratch cat. The upstream decks are in git history: `git show c6e42f3:src/lib/libraries/decks/index.jsx`.
//
// Deck format (key = deck id):
//     'robbo-first-steps': {
//         name: <FormattedMessage id="gui.howtos.robbo-first-steps.name" defaultMessage="…" description="…" />,
//         tags: ['robot'],
//         category: CATEGORIES.gettingStarted,
//         img: thumbnail,                      // imported image
//         steps: [{
//             title: <FormattedMessage … />,
//             image: stepImage                  // imported image URL (see translate-image.js)
//         }, {
//             video: '<wistia id>'               // optional, needs internet
//         }, {
//             deckIds: ['next-deck-id']          // optional, "what next" cards
//         }],
//         urlId: 'robboFirstSteps'               // for ?tutorial=robboFirstSteps
//     }
// Once there are lessons, enable TUTORIALS_UI_ENABLED in components/menu-bar/menu-bar.jsx.

export const CATEGORIES = {
    gettingStarted: 'gettingStarted',
    basics: 'basics',
    intermediate: 'intermediate',
    prompts: 'prompts'
};

export default {};
