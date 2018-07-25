
var gulp			= require('gulp');
var sass 			= require('gulp-sass');
var autoprefixer	= require('gulp-autoprefixer');
var minifyCss		= require('gulp-minify-css');
var rename			= require('gulp-rename');
var del				= require('del');
var htmlmin			= require('gulp-htmlmin');
var concat 			= require('gulp-concat');
var mergeStream		= require('merge-stream');
//var closureCompiler = require('google-closure-compiler').gulp();


gulp.task('default', ['html' ,'css' ,'scripts' ,'images' ,'watch','manifest']);

gulp.task('watch',()=>
{
	console.log('Default');
  	gulp.watch( [ './css/*.css' ] ,['css'] );
  	gulp.watch ( ['./js/*.js' ] ,['scripts']);
	gulp.watch ( [ 'manifest.json' ], ['manifest'] );
	gulp.watch(['./html/*.html','./popup.html'],['html']);
	gulp.watch(['./node_modules/extension-framework/*.js'
		,'./node_modules/promiseutil/*.js'
		,'./node_modules/db-finger/DatabaseStore.js'
		,'./node_modules/amazon-parser/AmazonParser.js'],['scripts']);
});


gulp.task('manifest',()=>
{
	return gulp.src(['./manifest.json'])
	.pipe(gulp.dest('./dist/') );
});

gulp.task('html',()=>
{
	return gulp.src(['./popup.html'])
 		.pipe(htmlmin({
			collapseWhitespace	: true
			,removeComments		: true
		}))
		.pipe(gulp.dest('./dist/'));
});

gulp.task('images',()=>
{
	return gulp.src(['images/*.png','*.png'])
	.pipe( gulp.dest('dist/images/') );
});

gulp.task('css', function () {

	return gulp.src('./css/*.css')
		.pipe( gulp.dest('./dist/css/') );
});



gulp.task('scripts', function()
{
	let extension = gulp.src(['./node_modules/extension-framework/*.js'])
		.pipe(gulp.dest('./dist/js/extension-framework/') );

	let utils = gulp.src(['./node_modules/promiseutil/*.js'])
		.pipe(gulp.dest('./dist/js/Promise-Utils/') );

	let ap	= gulp.src(['./node_modules/amazon-parser/*.js'])
		.pipe(gulp.dest( './dist/js/AmazonParser/' ) );

	let scripts	=  gulp.src(['./js/*.js']).pipe( gulp.dest('./dist/js/') );

	let db		= gulp.src(['./node_modules/db-finger/DatabaseStore.js'] )
		.pipe( gulp.dest('./dist/js/db-finger/' ) );

	return mergeStream( extension, utils, scripts, ap, db );
});

