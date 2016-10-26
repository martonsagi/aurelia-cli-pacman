import gulp from 'gulp';
import merge from 'merge-stream';
import * as project from '../aurelia.json';
import path from 'path';

export default function prepareMaterialize() {
  let source = 'node_modules/materialize-css';

  let taskCss = gulp.src(path.join(source, 'dist/css/materialize.min.css'))
    .pipe(gulp.dest(path.join(project.platform.output, '../', 'styles')));

  let taskFonts = gulp.src(path.join(source, 'dist/fonts/roboto/*'))
    .pipe(gulp.dest(path.join(project.platform.output, '../', 'fonts/roboto')));

  return merge(taskCss, taskFonts);
}
