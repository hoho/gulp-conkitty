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


function adjustFilename(filename, rebase) {
    var base = path.resolve('.');
    var f = path.resolve(filename);

    if (f.substring(0, base.length) === base) {
        return path.relative(base, f);
    } else if (rebase) {
        var cur;

        for (var key in rebase) {
            if ((f.substring(0, key.length) === key) && (!cur || cur.length < key.length)) {
                cur = key;
            }
        }

        if (cur) {
            f = f.substring(cur.length + (f[cur.length] === path.sep ? 1 : 0));
            return path.resolve(base, path.join(rebase[cur], f));
        }
    }

    this.emit('error', new PluginError('gulp-conkitty', 'File `' + filename + '` is outside current working directory'));
}


module.exports = function(paths) {
    if (!paths) throw new PluginError('gulp-conkitty', 'Missing `paths` option for gulp-conkitty');

    var conkitty = new Conkitty();

    function bufferContents(file) {
        if (file.isNull()) { return; }
        if (file.isStream()) {
            this.emit('error', new PluginError('gulp-conkitty',  'Streaming not supported'));
            return;
        }

        try {
            conkitty.push(path.normalize(path.relative(path.resolve('.'), path.resolve(file.path))), file.contents.toString());
        } catch(e) {
            this.emit('error', new PluginError('gulp-conkitty', e.message));
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
        var filename;

        if (paths.common && ((contents = conkitty.getCommonCode()))) {
            filename = adjustFilename.call(this, paths.common);
            if (!filename) { return; }

            this.emit('data', new File({
                path: filename,
                contents: new Buffer(contents)
            }));
        }

        if (paths.templates && ((contents = conkitty.getTemplatesCode()))) {
            filename = adjustFilename.call(this, paths.templates);
            if (!filename) { return; }

            this.emit('data', new File({
                path: filename,
                contents: new Buffer(contents)
            }));
        }

        if (paths.templates && paths.sourcemap && ((contents = conkitty.getSourceMap()))) {
            filename = adjustFilename.call(this, paths.sourcemap);
            if (!filename) { return; }

            this.emit('data', new File({
                path: filename,
                contents: new Buffer(contents)
            }));
        }

        if (paths.deps) {
            var includes = conkitty.getIncludes();
            var rebase = {};

            for (var key in paths.deps) {
                rebase[path.resolve(key)] = path.resolve(paths.deps[key])
            }

            for (var i = 0; i < includes.length; i++) {
                filename = adjustFilename.call(this, includes[i], rebase);
                if (!filename) { return; }

                this.emit('data', new File({
                    path: filename,
                    contents: fs.readFileSync(includes[i])
                }));
            }
        }

        this.emit('end');
    }

    return through(bufferContents, endStream);
};
