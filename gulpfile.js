
var gulp			= require('gulp');
var sass 			= require('gulp-sass');
var autoprefixer	= require('gulp-autoprefixer');
//var minifyCss		= require('gulp-minify-css');
var rename			= require('gulp-rename');
var del				= require('del');
var htmlmin			= require('gulp-htmlmin');
var concat 			= require('gulp-concat');
var mergeStream		= require('merge-stream');
//var closureCompiler = require('google-closure-compiler').gulp();

var amazonDir		= '/home/pejelover/Projects/AmazonParserEs6';
//var amazonDir		= './node_modules/amazon-parser';

function scripts_task(cb)
{
	gulp.src(['./manifest.json'])
		.pipe(gulp.dest('./dist/') );
	gulp.src(['images/*.png','*.png'])
		.pipe( gulp.dest('dist/images/') );

	gulp.src('./css/*.css')
		.pipe( gulp.dest('./dist/css/') );

	gulp.src(['./*.html'])
		.pipe(htmlmin({
			collapseWhitespace	: true
			,removeComments		: true
		}))
		.pipe(gulp.dest('./dist/'));

	gulp.src(['./node_modules/extension-framework/*.js'])
		.pipe(gulp.dest('./dist/js/extension-framework/') );

	gulp.src(['./node_modules/promiseutil/*.js'])
		.pipe(gulp.dest('./dist/js/Promise-Utils/') );

	gulp.src([amazonDir+'/*.js'])
		.pipe(gulp.dest( './dist/js/AmazonParser/' ) );

	gulp.src(['./js/*.js']).pipe( gulp.dest('./dist/js/') );

	gulp.src(['./node_modules/db-finger/DatabaseStore.js'] )
		.pipe( gulp.dest('./dist/js/db-finger/' ) );

	gulp.src(['./node_modules/diabetes/*.js'])
		.pipe( gulp.dest('./dist/js/Diabetes/' ) );

	gulp.src(['./node_modules/dealer-sorter/*.js'])
		.pipe( gulp.dest('./dist/js/dealer-sorter/' ) );

	cb();
}

function watch_task(cb)
{
	gulp.watch(
		[ './css/*.css'
			,'./js/*.js'
			, 'manifest.json'
			, './*.html'
			, './node_modules/extension-framework/*.js'
			,'./node_modules/promiseutil/*.js'
			,'./node_modules/db-finger/DatabaseStore.js'
			,'./node_modules/dealer-sorter/ArraySorter.js'
			,amazonDir+'/*.js'
		]
		,scripts_task
	);
	cb();
}

exports.default = gulp.series( scripts_task, watch_task );
