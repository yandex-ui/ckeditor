var gulp = require('gulp');
var del = require('del');
var replace = require('gulp-replace');

require('gulp-grunt')(gulp);

var SRC = {
    'icons_dir': __dirname + '/src/',
    'icons': __dirname + '/src/*/*.svg'
};

gulp.task('clean', function(cb) {
    del([
        __dirname + '/out/**'
    ], cb);
});

gulp.task('svg-remove-sketch-attrs', function() {
    return gulp.src(SRC.icons)
        .pipe(replace(/(sketch:type=".+?)"/g, ''))
        .pipe(gulp.dest(SRC.icons_dir));
});
