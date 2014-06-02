# gulp-conkitty [![Build Status](https://travis-ci.org/hoho/gulp-conkitty.svg?branch=master)](https://travis-ci.org/hoho/gulp-conkitty)

Compile Conkitty Templates

#### Install:

```sh
npm install gulp-conkitty --save-dev
```


#### Example:

```js
var conkitty = require('gulp-conkitty');

gulp.task('conkitty', function() {
    // Compile *.ctpl template files to common.js and tpl.js.
    return gulp.src(['./**/*.ctpl'])
        .pipe(conkitty({common: 'common.js', templates: 'tpl.js'}))
        .pipe(gulp.dest('./build'));
});
```


#### Example with dependencies ([here is actual example](https://github.com/hoho/conkitty/tree/master/example2)) and source map:

```js
var conkitty = require('gulp-conkitty');
var gulpFilter = require('gulp-filter');
var concat = require('gulp-concat');

gulp.task('conkitty', function() {
    var cssFilter = gulpFilter('**/*.css');
    var jsFilter = gulpFilter(['**/*.js', '!tpl.js']); // Everything except tpl.js.

    return gulp.src(['./src/**/*.ctpl'])
        // As the result of Conkitty plugin we get templates commons
        // (in common.js), compiled templates themselves (in tpl.js), and
        // declared in templates dependencies (because deps setting is true).
        .pipe(conkitty({
            common: 'common.js',
            templates: 'tpl.js',
            sourcemap: 'tpl.map',
            deps: true // Append external templates dependencies to the result.
        }))

        // Concat all css files to bundle deps.css.
        .pipe(cssFilter)
        .pipe(concat('deps.css'))
        .pipe(cssFilter.restore())

        // Concat all js files except for tpl.js to bundle deps.js.
        .pipe(jsFilter)
        .pipe(concat('deps.js'))
        .pipe(jsFilter.restore())

        .pipe(gulp.dest('./build')); // Copy deps.css, deps.js, tpl.js and tpl.map to ./build.
});
```

#### Life outside current working directory

In order to prevent destructivity, every file created by `gulp-conkitty`
should point somewhere inside current working directory:

```js
    .pipe(conkitty({templates: 'tpl.js'})) // is ok
    // but
    .pipe(conkitty({templates: '../tpl.js'})) // will throw an exception.
```

It is possible to rebase dependencies from outside your working directory.

Let's say we have project structure like this:

    /root
        /lib
            button.css
                .btn {background: red;}                            
            button.ctpl
                button $title
                    &"button.css"
                    button.btn[type="button"]
                        $title
        /myproj
            page.ctpl
                page
                    CALL button "Hello world"
            gulpfile.js
                ...
                gulp.task('conkitty', function() {
                    return gulp.src(['./page.ctpl', '../lib/button.ctpl'])
                        .pipe(conkitty({
                            templates: 'tpl.js',
                            deps: true
                        }))
                        .pipe(gulp.dest('./build'));
                });
                ...
            package.json

And we run `gulp` from `/root/myproj` directory:

    [gulp] Error in plugin 'gulp-conkitty': File `../lib/button.css` is outside current working directory
    
To fix that, we need to rebase outside dependencies and instead of `deps: true`
in `gulpfile.js` add rebase map:

```js
    .pipe(conkitty({
        templates: 'tpl.js',
        deps: {'../lib': './outerlib/'}
    }))
```

After that, `gulp` will run `conkitty` task fine and `/root/myproj/build` 
directory will look like:

    /build
        /outerlib
            button.css
        tpl.js

You can rebase multiple directories from outside your working directory and
use relative and absolute paths.

#### External libraries of templates

There is a bit of syntax sugar to add external libraries of templates.

    .pipe(conkitty({
        templates: 'tpl.js',
        deps: true, // sould be enabled.
        libs: {
            // We could have npm package with library of templates.
            superlib: require('mysuperlib')
        }
    }))

In this example `require('mysuperlib')` should return an object with two
properties:

+ `require('mysuperlib').BASE` should be an absolute path to library's base
   directory
+ `require('mysuperlib').FILES` should be an array of paths to template files.

`mysuperlib` file structure could look like:

    /mysuperlib
        package.json
        mysuperlib1.ctpl
        mysuperlib2.ctpl
        index.js
            module.exports = {
                BASE: __dirname, // Actual path to index.js.
                FILES: ['mysuperlib1.ctpl', 'mysuperlib2.ctpl']
            };

Dependencies of external library (if any) will be rebased using `libs` object
key:

    .pipe(conkitty({
        templates: 'tpl.js',
        deps: true,
        libs: {
            superlib: require('mysuperlib'), // Dependencies will go to `superlib/*`
            'complex/path/lib': require('mysuperlib2') // Dependencies will go to `complex/path/lib/*`
        }
    }))
