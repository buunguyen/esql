var gulp       = require('gulp')
  , es         = require('event-stream')
  , series     = require('stream-series')  
  , $          = require('gulp-load-plugins')()
  , fs         = require('fs')
  , source     = require('vinyl-source-stream')
  , buffer     = require('vinyl-buffer')
  , browserify = require('browserify');

function pipe(src, transforms, dest) { 
  if (typeof transforms === 'string') {
    dest = transforms
    transforms = null
  }
  var stream = src.pipe ? src : gulp.src(src)
  transforms && transforms.forEach(function (transform) {
    stream = stream.pipe(transform)
  })
  if (dest) stream = stream.pipe(gulp.dest(dest))
  return stream
}

gulp.task('default', ['build'])

gulp.task('build', ['test'], function () {
  return pipe(
    browserify('./lib/esql.js', { standalone: 'esql' }).bundle(),
    [ source('esql.js'), buffer(),
      gulp.dest('./browser'), 
      $.uglify(), $.rename('esql.min.js')
    ],
    './browser')
})

gulp.task('test', ['peg'], function () {
  return pipe('./test/**/*.js', [$.mocha({ reporter: 'spec' })])
})

gulp.task('peg', ['jshint'], function () {
  return pipe('./lib/parser.pegjs', [$.peg().on('error', $.util.log)], './lib')
})

gulp.task('jshint', function () {
  return pipe(['./lib/**/*.js', '!./lib/parser.js'], [$.jshint(), $.jshint.reporter('jshint-stylish')])
})
