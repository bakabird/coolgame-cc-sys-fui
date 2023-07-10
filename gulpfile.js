const gulp = require('gulp')
const rollup = require('rollup')
const ts = require('gulp-typescript');
const rename = require("gulp-rename");
const uglify = require('gulp-uglify-es').default;
const dts = require('dts-bundle')
const package = require("./package.json")
const tsProject = ts.createProject('tsconfig.json', { declaration: true });

const name = package.name
const external = ['cc', 'cc/env', 'coolgame-cc', 'gnfun', 'fairygui-ccc370', 'gnfun-cc', 'coolgame-cc-sys-time']

const onwarn = warning => {
    // Silence circular dependency warning for moment package
    if (warning.code === 'CIRCULAR_DEPENDENCY')
        return

    console.warn(`(!) ${warning.message}`)
}

gulp.task('buildJs', () => {
    return tsProject.src().pipe(tsProject()).pipe(gulp.dest('./build'));
})

gulp.task("rollup", async function () {
    let output = {
        file: `dist/${name}.mjs`,
        format: 'esm',
        extend: true,
        name: 'coolgame-cc-sys-time',
    };
    let config = {
        input: "build/Main.js",
        external,
        output,
    };
    const subTask = await rollup.rollup(config);
    await subTask.write(output);
});

gulp.task("uglify", function () {
    return gulp.src(`dist/${name}.mjs`)
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify(/* options */))
        .pipe(gulp.dest("dist/"));
});

gulp.task('buildDts', function () {
    return new Promise(function (resolve, reject) {
        dts.bundle({ name: `${name}`, main: `./build/Main.d.ts`, out: `../dist/${name}.d.ts` });
        resolve();
    });
})

gulp.task('build', gulp.series(
    'buildJs',
    'rollup',
    'uglify',
    'buildDts'
))