/**
 * Browser-safe replacement for scratch-parser/lib/unpack (adm-zip + fs/path).
 * Used via webpack alias for web builds only.
 */
var JSZip = require('jszip');

module.exports = function (input, callback) {
    var typeError = 'Input must be a Buffer.';
    if (!Buffer.isBuffer(input)) return callback(typeError);

    var signature = input.slice(0, 3).join(' ');
    var isLegacy = signature.indexOf('83 99 114') === 0;
    var isZip = signature.indexOf('80 75') === 0;

    if (!isZip && !isLegacy) return callback(null, input.toString('utf-8'));
    if (isLegacy) return callback('Parser only supports Scratch 2.X');

    JSZip.loadAsync(input)
        .then(function (zip) {
            var file = zip.file('project.json');
            if (!file) {
                throw new Error('project.json not found in sb3');
            }
            return file.async('string');
        })
        .then(function (project) {
            callback(null, project);
        })
        .catch(function (err) {
            callback(err);
        });
};
