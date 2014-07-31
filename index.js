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
    return false;
}


function pushConkittyFile(conkitty, filename, content) {
    try {
        conkitty.push(path.normalize(path.relative(path.resolve('.'), path.resolve(filename))), content);
        return true;
    } catch(e) {
        this.emit('error', new PluginError('gulp-conkitty', e.message));
        return false;
    }
}


module.exports = function(settings) {
    if (!settings) throw new PluginError('gulp-conkitty', 'Missing `settings` for gulp-conkitty');

    var conkitty = new Conkitty();

    function bufferContents(file) {
        if (file.isNull()) { return; }
        if (file.isStream()) {
            this.emit('error', new PluginError('gulp-conkitty',  'Streaming not supported'));
            return;
        }

        pushConkittyFile.call(this, conkitty, file.path, file.contents.toString());
    }

    function endStream() {
        if (settings.libs) {
            var libKey,
                lib;

            for (libKey in settings.libs) {
                lib = settings.libs[libKey];

                if (typeof lib.BASE !== 'string' || !(lib.FILES instanceof Array)) {
                    this.emit('error', new PluginError('gulp-conkitty', '`' + libKey + '.BASE` and `' + libKey + '.FILES` have to be string and array'));
                    return;
                }

                if (!settings.deps) {
                    this.emit('error', new PluginError('gulp-conkitty', '`settings.deps` should be enabled'));
                    return;
                }

                if (typeof settings.deps !== 'object') {
                    settings.deps = {};
                }

                settings.deps[lib.BASE] = libKey;

                lib.FILES.every(function(filename) {
                    filename = path.resolve(lib.BASE, filename);
                    return pushConkittyFile.call(this, conkitty, filename, fs.readFileSync(filename).toString());
                }, this);
            }
        }

        var common,
            noConcatJS;

        if ((common = settings.common)) {
            noConcatJS = common['concat.js'] === false;
            common = common.file || common;
            if (typeof common !== 'string') {
                common = undefined;
            }
        }

        try {
            conkitty.generate(
                settings.templates && settings.sourcemap ?
                    path.normalize(path.relative(path.dirname(path.resolve(settings.templates)), path.resolve(settings.sourcemap)))
                    :
                    undefined,
                noConcatJS
            );
        } catch(e) {
            this.emit('error', new PluginError('gulp-conkitty', e.message));
            return;
        }

        var contents;
        var filename;

        if (common && ((contents = conkitty.getCommonCode()))) {
            filename = adjustFilename.call(this, common);
            if (!filename) { return; }

            this.emit('data', new File({
                path: filename,
                contents: new Buffer(contents)
            }));
        }

        if (settings.templates && ((contents = conkitty.getTemplatesCode()))) {
            filename = adjustFilename.call(this, settings.templates);
            if (!filename) { return; }

            this.emit('data', new File({
                path: filename,
                contents: new Buffer(contents)
            }));
        }

        if (settings.templates && settings.sourcemap && ((contents = conkitty.getSourceMap()))) {
            filename = adjustFilename.call(this, settings.sourcemap);
            if (!filename) { return; }

            this.emit('data', new File({
                path: filename,
                contents: new Buffer(contents)
            }));
        }

        if (settings.deps) {
            var includes = conkitty.getIncludes();
            var rebase = {};

            for (var key in settings.deps) {
                rebase[path.resolve(key)] = path.resolve(settings.deps[key])
            }

            includes = includes.every(function(include) {
                filename = adjustFilename.call(this, include, rebase);
                if (!filename) {
                    return false;
                }

                this.emit('data', new File({
                    path: filename,
                    contents: fs.readFileSync(include)
                }));

                return true;
            }, this);

            if (!includes) {
                return;
            }
        }

        this.emit('end');
    }

    return through(bufferContents, endStream);
};
