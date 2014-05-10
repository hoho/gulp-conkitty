# gulp-conkitty [![Build Status](https://travis-ci.org/hoho/gulp-conkitty.svg?branch=master)](https://travis-ci.org/hoho/gulp-conkitty)

Compile Conkitty Templates

Install:

```sh
npm install gulp-conkitty --save-dev
```


Example:

```js
var conkitty = require('gulp-conkitty');

gulp.task('conkitty', function() {
    // Compile *.ctpl template files to common.js and tpl.js.
    return gulp.src(['./**/*.ctpl'])
        .pipe(conkitty({common: 'common.js', templates: 'tpl.js'}))
        .pipe(gulp.dest('./build'));
});
```


Example with dependencies:

```js
var conkitty = require('gulp-conkitty');
var gulpFilter = require('gulp-filter');
var concat = require('gulp-concat');

gulp.task('conkitty', function() {
    var cssFilter = gulpFilter('**/*.css');
    var jsFilter = gulpFilter(['**/*.js', '!tpl.js']); // Everything except tpl.js.

    return gulp.src(['./src/**/*.ctpl'])
        .pipe(conkitty({
            common: 'common.js',
            templates: 'tpl.js',
            deps: true // Append external templates dependencies to the result.
        }))

        // As the result of Conkitty plugin we get templates commons
        // (in common.js), compiled templates themselves (in tpl.js), and
        // declared in templates dependencies (because deps setting is true).
        .pipe(cssFilter)
        .pipe(concat('deps.css')) // Concat all css files to bundle deps.css.
        .pipe(cssFilter.restore())

        .pipe(jsFilter)
        .pipe(concat('deps.js')) // Concat all js files except for tpl.js to bundle deps.js.
        .pipe(jsFilter.restore())

        .pipe(gulp.dest('./build')); // Copy deps.css, deps.js and tpl.js to dst.
});
```
