import gulp from 'gulp'
import path from 'path'
import koaService from 'gulp-koa-service'
import babel from 'gulp-babel'
import changed from 'gulp-changed'
import del from 'del'

const src = path.resolve(`${__dirname}/../src/**/*.js`)
const build = path.resolve(`${__dirname}/../build/`)

gulp.task(`clean`, () => {
  return del([build])
})

gulp.task(`transpile`, () => {
  return gulp.src(src)
  .pipe(changed(build))
  .pipe(babel({
    plugins: [`transform-runtime`]
  }))
  .pipe(gulp.dest(build))
})

gulp.task(`run-service`, () => {
  return gulp.src(`${build}/index.js`)
  .pipe(koaService())
  .on(`error`, (err) => { console.error(err.message) })
})

gulp.task(`watch`, () => {
  return gulp.watch(
    src,
    { ignoreInitial: false },
    gulp.series(`clean`, `transpile`, `run-service`)
  )
})
 
