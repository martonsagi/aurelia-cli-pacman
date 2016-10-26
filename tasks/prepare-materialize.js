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

export default gulp.series(gulp.parallel.apply(gulp, [taskFonts, taskCss]));

