import gulp from 'gulp';

let source = './node_modules/materialize-css';

let taskCss = () => {
    return gulp
        .src([`${source}/dist/css/*.min.css`])
        .pipe(gulp
            .dest('styles')
        );
};

let taskFonts = () => {
    return gulp
        .src([`${source}/dist/fonts/roboto/*`])
        .pipe(gulp
            .dest('fonts/roboto')
        );
};

let taskTools = () => {
    // copy tools folder from ./node_modules/aurelia-materialize-bridge/<path> to /<dest>
    return gulp
        .src(['./node_modules/aurelia-materialize-bridge/build/tools/*.js'])
        .pipe(
            gulp.dest('.')
        );
};

export default gulp.series(gulp.parallel.apply(gulp, [taskFonts, taskCss, taskTools]));

