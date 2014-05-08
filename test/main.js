var conkitty = require('../');
var should = require('should');
var path = require('path');
var File = require('gulp-util').File;
var Buffer = require('buffer').Buffer;
var fs = require('fs');
require('mocha');

describe('gulp-conkitty', function() {
    describe('conkitty()', function() {
        testConkitty(
            conkitty({
                common: 'tmp/ok.common',
                templates: 'tmp/ok',
                deps: 'tmp/ok.deps'
            }),
            [
                'test/tpl1.ctpl',
                'test/tpl2.ctpl'
            ],
            [
                'tmp/ok.common', '/*!\n * concat.js v0.9.3',
                'tmp/ok', '(function($C, $ConkittyEnvClass',
                'test/file3.css', '.clsss3 {}',
                'test/file2.js', 'function func2() {}',
                'test/file1.css', '.class1 {}',
                'test/file2.css', '.class2 {}',
                'test/file1.js', 'function func1() {}'
            ]
        );

        testConkitty(
            conkitty({
                common: 'tmp/empty.common',
                templates: 'tmp/empty'
            }),
            ['test/tpl3.ctpl'],
            []
        );

        testConkitty(
            conkitty({
                templates: 'tmp/nocommon',
                deps: 'tmp/nofile.deps'
            }),
            ['test/tpl2.ctpl'],
            [
                'tmp/nocommon', '(function($C, $ConkittyEnvClass',
                'test/file3.css', '.clsss3 {}',
                'test/file2.js', 'function func2() {}'
            ]
        );

        function testConkitty(stream, files, results) {
            it('should compile templates', function(done) {
                stream.on('data', function (file) {
                    var expectedFilename = results.shift(),
                        expectedHead = results.shift();

                    should.exist(file);
                    should.exist(file.relative);
                    should.exist(file.contents);
                    should.exist(expectedFilename);
                    should.exist(expectedHead);

                    var retFilename = path.resolve(file.path);
                    retFilename.should.equal(path.resolve(expectedFilename));
                    file.relative.should.equal(expectedFilename);

                    Buffer.isBuffer(file.contents).should.equal(true);
                    file.contents.toString().substring(0, expectedHead.length).should.equal(expectedHead);

                    if (results && !results.length) {
                        results = null;
                        done();
                    }
                });

                files.forEach(function (filename) {
                    filename = path.resolve(filename);
                    stream.write(new File({
                        base: path.dirname(filename),
                        path: filename,
                        contents: fs.readFileSync(filename)
                    }));
                });

                stream.end();

                if (results && !results.length) {
                    results = null;
                    done();
                }
            });
        }
    });
});
