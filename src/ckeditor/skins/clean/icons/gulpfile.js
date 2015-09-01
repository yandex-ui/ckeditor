var gulp = require('gulp');
var del = require('del');
var filelog = require('gulp-filelog');
var replace = require('gulp-replace');
var gulpGrunt = require('gulp-grunt');
var gruntTasks = gulpGrunt.tasks();
// add all the gruntfile tasks to gulp
gulpGrunt(gulp);

var SRC = {
    icons_dir: './src/'
};
SRC.icons = SRC.icons_dir + '*.svg'

var DEST = './out/';
var DEST_ICONS = DEST;
var DEST_SVG_ICONS = DEST_ICONS + '*/*.svg';
var DEST_SVG_ICONS_YATE_SAFE = DEST_ICONS + 'yate_safe/';

gulp.task('clean', function(cb) {
    del([
        'out/**'
    ], cb);
});

/**
 * Removes attributes with Sketch namespace.
 * Workaround for yoksel/svg-fallback#6
 */
gulp.task('svg-remove-sketch-attrs', function() {
    return gulp.src(SRC.icons)
        .pipe(replace(/(sketch:type=".+?)"/g, ''))
        .pipe(gulp.dest(SRC.icons_dir));
});
