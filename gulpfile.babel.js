import gulp from 'gulp'
import requireDir from 'require-dir'

requireDir(`./gulp`, { recurse: true });

gulp.task(`default`, gulp.parallel(`watch`))

gulp.task(`pull`,  gulp.series(`initial-pull`, `initial-insert`))
gulp.task(`push`,  gulp.series(`look-for-changes`, `look-for-new-items`, `push-changed`, `create-new`))
