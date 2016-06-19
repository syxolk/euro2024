const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const less = require('gulp-less');
const autoprefixer = require('gulp-autoprefixer');
const cleancss = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const rev = require('gulp-rev');

gulp.task('scripts', function() {
    return gulp.src([
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/chart.js/dist/Chart.min.js',
        'assets/save_bets.js',
        'assets/history.js',
        'assets/friend.js',
        'assets/friend_history.js'
    ])
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(concat('bundle.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task('styles', function() {
    return gulp.src('assets/bundle.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(autoprefixer({
        browsers: ['last 2 versions'],
        cascade: false
    }))
    .pipe(cleancss())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task('fonts', function() {
    return gulp.src('node_modules/font-awesome/fonts/*.*')
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('default', ['scripts', 'styles', 'fonts']);
