"use strict";

const gulp = require('gulp');
const rollup = require('rollup').rollup;
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const inlineNg2Template = require('gulp-inline-ng2-template');
const ts = require('gulp-typescript');
const del = require('del');
const sourcemaps = require('gulp-sourcemaps');
const browserify = require('browserify');
const uglify = require('gulp-uglify');
const htmlMin = require('gulp-html-minifier');
const cleanCSS = require('gulp-clean-css');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const htmlReplace = require('gulp-html-replace');
const sass = require('gulp-sass');
const pump = require('pump');
const tar = require('gulp-tar');
const gzip = require('gulp-gzip');
const GulpSSH = require('gulp-ssh');
const fs = require('fs');
const rename = require("gulp-rename");
const runSequence = require('run-sequence');
const tsProject = ts.createProject('tsconfig.json');
const config = require('./config/gulp.json');

let currentDateTimeStamp = new Date().getTime();

let gulpSSH = new GulpSSH({
    ignoreErrors: false,
    sshConfig: config.ssh
});

gulp.task('copy-htaccess-main', function() {
    return gulp.src('./app/.htaccess').pipe(gulp.dest('./release/app'));
});

gulp.task('copy-htaccess-lib', function() {
    return gulp.src('./app/.htaccess').pipe(gulp.dest('./release/lib'));
});

/**
 * app htaccess file
 */
gulp.task('copy-htaccess', ['copy-htaccess-main', 'copy-htaccess-lib']);

/**
 * Copy scripts to build/lib directory
 */
gulp.task('copy-scripts', function() {
    let scripts = [
        'node_modules/core-js/client/shim.min.js',
        'node_modules/zone.js/dist/zone.js',
        'node_modules/reflect-metadata/Reflect.js',
        'node_modules/systemjs/dist/system.src.js',
        'node_modules/@angular/core/bundles/core.umd.js',
        'node_modules/@angular/common/bundles/common.umd.js',
        'node_modules/@angular/compiler/bundles/compiler.umd.js',
        'node_modules/@angular/platform-browser/bundles/platform-browser.umd.js',
        'node_modules/@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js',
        'node_modules/@angular/http/bundles/http.umd.js',
        'node_modules/@angular/router/bundles/router.umd.js',
        'node_modules/@angular/forms/bundles/forms.umd.js'
    ];

    return gulp.src(scripts).pipe(gulp.dest('build/lib'));
});

/**
 * Copy RXJS lib to build folder
 */
gulp.task('copy-rxjs', function() {
    return gulp.src('node_modules/rxjs/**/*').pipe(gulp.dest('build/lib/rxjs'));
});

/**
 * Copy html files to build directory
 */
gulp.task('copy-html', function() {
    return gulp.src([
        './**/*.html',
        '!./build/**/*.html',
        '!./node_modules/**/*.html',
        '!./api/**/*.html',
        '.htaccess',
        config.googleKey + '.html'
    ]).pipe(gulp.dest('build'));
});

/**
 * Copy API files to build directory
 */
gulp.task('copy-api', function() {
    return gulp.src(['api/**/*', '!api/Dockerfile', '!api/start', '!api/apache-config.conf'], {
            dot: true
        })
        .pipe(gulp.dest('build/api'));
});

/**
 * Copy configurations
 */
gulp.task('copy-config', function() {
    return gulp.src('config/systemjs.config.js').pipe(gulp.dest('build/config'));
});

/**
 * Copy app icons
 */
gulp.task('copy-app-icons', function() {
    return gulp.src(['app-icons/**/*', '!build/app-icons/**/*'], {
            dot: true
        })
        .pipe(gulp.dest('build/app-icons'));
});

/**
 * Copy favicon
 */
gulp.task('copy-favicon', function() {
    return gulp.src(['favicon.ico', '!build/favicon.icon'], {
            dot: true
        })
        .pipe(gulp.dest('build'));
});

/**
 * Copy web config files
 */
gulp.task('copy-webconfig-files', function() {
    return gulp.src(['browserconfig.xml', 'manifest.json'], {
            dot: true
        })
        .pipe(gulp.dest('build'));
});

/**
 * Copies a build to a relase
 */
gulp.task('copy-build', function() {
    return gulp.src(['build/**/*'], {
        dot: true
    }).pipe(gulp.dest('release/'));
});

/**
 * Cleans build folder
 */
gulp.task('clean', function(cb) {
    del('dist', cb);
    del('build', cb);
    del('release', cb);
});

/**
 * Compiles TypeScript files into Javascript
 * Also adds sourcemaps
 */
gulp.task('compile-typescript', function() {
    let tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject));

    return tsResult.js
        .pipe(sourcemaps.write("maps"))
        .pipe(gulp.dest("build"));
});

/**
 * Compile sass files into css into the build folder
 */
gulp.task('sass', function() {
    return gulp
        .src(['./**/*.scss', '!build/**/*.scss', '!node_modules/**/*'])
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(sourcemaps.write("maps"))
        .pipe(gulp.dest('build'));
});

/**
 * Concats helper js files
 */
gulp.task('concat-helpers', function() {
    return gulp.src([
            'release/lib/shim.min.js',
            'release/lib/zone.js',
            'release/lib/Reflect.js',
            'release/lib/system.src.js',
            'release/config/systemjs.config.js'
        ])
        .pipe(concat({
            path: 'helpers.min.js',
            stat: {
                mode: '0666'
            }
        }))
        .pipe(gulp.dest('release/lib'));
});

/**
 * Uglify helper js file
 */
gulp.task('uglify-helpers', ['concat-helpers'], function(cb) {
    pump([
            gulp.src(['release/lib/helpers.min.js']),
            uglify(),
            gulp.dest('release/lib')
        ],
        cb
    );
});

/**
 * Compress js files for release
 */
gulp.task('uglify', ['uglify-helpers'], function(cb) {
    pump([
            gulp.src(['release/**/*.js', '!release/lib/**/*', '!release/api/**/*']),
            babel({
                presets: ['es2015']
            }),
            uglify(),
            gulp.dest('release/')
        ],
        cb
    );
});

/**
 * Cleans helper files for release
 */
gulp.task('clean-helpers', ['clean-index'], function() {
    return del([
        'release/lib/shim.min.js',
        'release/lib/zone.js',
        'release/lib/Reflect.js',
        'release/lib/system.src.js',
        'release/config/systemjs.config.js'
    ]);
});

/**
 * Refactors index.html
 */
gulp.task('clean-index', function() {
    gulp.src('release/index.html')
        .pipe(htmlReplace({
            'js': {
                src: [['lib/helpers.min.'+currentDateTimeStamp+'.js']],
                tpl: '<script>var currentDateTimeStamp = '+currentDateTimeStamp+';</script><script src="%s" async></script>'
            },
            'analytics': {
                src: [['/api/www/services/content/public/analytics.'+currentDateTimeStamp+'.js']],
                tpl: '<script src="%s" async defer></script>'
            },
            'css': {
                src: [['/app/main.'+currentDateTimeStamp+'.css']],
                tpl: '<link rel="stylesheet" type="text/css" href="%s"/>'
            },
            'criticalCss': {
                src: gulp.src('./config/critical.scss').pipe(sass()),
                tpl: '<style>%s</style>'
            },
            'criticalHtml': {
                src: gulp.src('./config/critical.html').pipe(htmlMin()),
                tpl: '<?php $rootDir = "'+config.rootDir+'"; ?>%s'
            }
        }))
        .pipe(gulp.dest('release/'));
});

/**
 * Cleans CSS
 */
gulp.task('minify-css', function() {
    return gulp.src(['./release/**/*.css', '!release/lib/**/*', '!release/api/**/*'])
        .pipe(cleanCSS({
            compatibility: 'ie8'
        }))
        .pipe(gulp.dest('./release'))
});

/**
 * Cleans HTML
 */
gulp.task('minify-html', function() {
    return gulp.src([
            './release/**/*.html',
            '!release/lib/**/*',
            '!release/api/**/*',
            '!release/index.html'
        ])
        .pipe(htmlMin({
            collapseWhitespace: true,
            removeComments: true,
            caseSensitive: true
        }))
        .pipe(gulp.dest('./release'))
});

/**
 * Cleans HTML and CSS
 */
gulp.task('minify-html-css', ['minify-html', 'minify-css']);

/**
 * Inline HTML and CSS
 */
gulp.task('inline', function() {
    return gulp.src(['release/**/*.js', '!release/lib/**/*', '!release/api/**/*'])
        .pipe(inlineNg2Template({
            base: 'release'
        }))
        .pipe(gulp.dest('./release'));
});

/**
 * Creates a bundle for the app
 */
gulp.task('bundle', function() {
    return rollup({
        entry: 'release/app/main.js',
        plugins: [
            nodeResolve({
                jsnext: true
            }),
            commonjs()
        ]
    }).then(function(bundle) {
        return bundle.write({
            format: 'iife',
            moduleName: 'IGenius',
            dest: 'release/app/main.js'
        });
    });
});

/**
 * Watcher
 */
gulp.task('dev', ['build'], function() {
    gulp.watch(['./app/**/*.scss'], ['sass']);
    gulp.watch(['./app/**/*.ts'], ['compile-typescript']);
    gulp.watch(['./index.html', './app/**/*.html'], ['copy-html']);
});

/**
 * Deploy tasks
 */
gulp.task('copy', ['copy-scripts', 'copy-html', 'copy-config', 'copy-rxjs', 'copy-api', 'copy-app-icons', 'copy-favicon', 'copy-webconfig-files']);
gulp.task('build', ['compile-typescript', 'copy', 'sass']);
gulp.task('release', ['copy-build']);
gulp.task('compress', function() {
    let rootDir = config.rootDir;

    return gulp.src(['release/**/*'], {
            dot: true
        })
        .pipe(tar('release-' + currentDateTimeStamp + '.tar'))
        .pipe(gzip())
        .pipe(gulp.dest('dist'))
        .pipe(gulpSSH.sftp('write', rootDir + 'release-' + currentDateTimeStamp + '.tar.gz'));
});

gulp.task('symlink', ['compress'], function() {
    let rootDir = config.rootDir;

    return gulpSSH
        .exec([
            'mkdir ' + rootDir + currentDateTimeStamp,
            'tar -xvf ' + rootDir + 'release-' + currentDateTimeStamp + '.tar.gz -C ' + rootDir + currentDateTimeStamp,
            'rm -rf ' + rootDir + 'release-' + currentDateTimeStamp + '.tar.gz',
            'rm -rf ' + rootDir + 'current',
            'ln -s ' + rootDir + currentDateTimeStamp + ' ' + rootDir + 'current',
            'mv ' + rootDir + currentDateTimeStamp + '/index.html ' + rootDir + currentDateTimeStamp + '/api/www/services/content/resources/views/index.php',
            'ln -s ' + rootDir + currentDateTimeStamp + '/api/www/services/content/resources/views/index.php ' + rootDir + currentDateTimeStamp + '/index.php'
        ]);
});

/**
 * Cleans release files
 */
gulp.task('clean-release', function(cb) {
    return del([
            'release/app/components',
            'release/app/models',
            'release/app/services',
            'release/app/config.js',
            'release/config',
            'release/lib/shim.min.js',
            'release/lib/zone.js',
            'release/lib/Reflect.js',
            'release/lib/system.src.js',
            'release/lib/core.umd.js',
            'release/lib/common.umd.js',
            'release/lib/compiler.umd.js',
            'release/lib/platform-browser.umd.js',
            'release/lib/platform-browser-dynamic.umd.js',
            'release/lib/http.umd.js',
            'release/lib/router.umd.js',
            'release/lib/forms.umd.js',
            'release/lib/rxjs'
        ],
        cb);
});

/**
 * Bustcache files
 */
gulp.task('timestamp', function() {
    return gulp.src(["./release/app/*.css", "./release/app/*.js", "./release/lib/*.js"])
      .pipe(rename(function (path) {
          if (path.basename === 'helpers.min') {
              path.dirname = 'lib'
          } else {
              path.dirname = 'app'
          }
        path.basename += "." + currentDateTimeStamp;
        return path;
    })).pipe(gulp.dest("./release/"));
});

gulp.task('stage', function(done) {
    runSequence('build', 'release', 'copy-htaccess', 'minify-html-css', 'inline', 'bundle', 'uglify', 'clean-helpers', 'clean-release', 'timestamp');
    done();
});

gulp.task('deploy', function(done) {
    runSequence('build', 'release', 'copy-htaccess', 'minify-html-css', 'inline', 'bundle', 'uglify', 'clean-helpers', 'clean-release', 'timestamp', 'symlink', 'clean');
    done();
});