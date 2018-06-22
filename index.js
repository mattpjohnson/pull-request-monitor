const { Monitor } = require('./src/monitor')

module.exports = robot => {
  robot.on('status', async context => {
    if (!context.payload.state === 'failure') {
      return
    }

    const monitor = new Monitor(context)
    monitor.markAllFailedPullRequests()
  })
}
