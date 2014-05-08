var Conkitty = require('conkitty');
var through = require('through');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var Buffer = require('buffer').Buffer;
var fs = require('fs');

module.exports = function(paths) {
    if (!paths) throw new PluginError('gulp-conkitty', 'Missing `paths` option for gulp-conkitty');

    var conkitty = new Conkitty();

    function bufferContents(file) {
        if (file.isNull()) { return; }
        if (file.isStream()) { return this.emit('error', new PluginError('gulp-conkitty',  'Streaming not supported')); }

        try {
            conkitty.push(file.path, file.contents.toString());
        } catch(e) {
            return this.emit('error', new PluginError('gulp-conkitty', e.message));
        }
    }

    function endStream() {
        try {
            conkitty.generate();
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
