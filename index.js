/*!
 * gulp-conkitty, https://github.com/hoho/gulp-conkitty
 * (c) 2014 Marat Abdullin, MIT license
 */

'use strict';

var Conkitty = require('conkitty');
var through = require('through');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var Buffer = require('buffer').Buffer;
var fs = require('fs');
var path = require('path');

module.exports = function(paths) {
    if (!paths) throw new PluginError('gulp-conkitty', 'Missing `paths` option for gulp-conkitty');

    var conkitty = new Conkitty();

    function bufferContents(file) {
        if (file.isNull()) { return; }
        if (file.isStream()) { return this.emit('error', new PluginError('gulp-conkitty',  'Streaming not supported')); }

        try {
            conkitty.push(path.normalize(path.relative(path.resolve('.'), path.resolve(file.path))), file.contents.toString());
        } catch(e) {
            return this.emit('error', new PluginError('gulp-conkitty', e.message));
        }
    }

    function endStream() {
        try {
            conkitty.generate(
                paths.templates && paths.sourcemap ?
                    path.normalize(path.relative(path.dirname(path.resolve(paths.templates)), path.resolve(paths.sourcemap)))
                    :
                    undefined
            );
        } catch(e) {
            return this.emit('error', new PluginError('gulp-conkitty', e.message));
        }

        var contents;

        if (paths.common && ((contents = conkitty.getCommonCode()))) {
            this.emit('data', new File({
                path: paths.common,
                contents: new Buffer(contents)
            }));
        }

        if (paths.templates && ((contents = conkitty.getTemplatesCode()))) {
            this.emit('data', new File({
                path: paths.templates,
                contents: new Buffer(contents)
            }));
        }

        if (paths.templates && paths.sourcemap && ((contents = conkitty.getSourceMap()))) {
            this.emit('data', new File({
                path: paths.sourcemap,
                contents: new Buffer(contents)
            }));
        }

        if (paths.deps) {
            var self = this;
            conkitty.getIncludes().forEach(function(filename) {
                self.emit('data', new File({
                    path: filename,
                    contents: fs.readFileSync(filename)
                }));
            });
        }

        this.emit('end');
    }

    return through(bufferContents, endStream);
};
