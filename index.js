const fetch = require('node-fetch')
const getConfig = require('probot-config')

const CircleCI = require('circleci')
const ci = new CircleCI({
  auth: process.env.CIRCLE_CI_AUTH_TOKEN
})

function getFailedPullRequests({ context }) {
  return getPullRequestsForCommit({ context, commit: context.payload.commit })
}

async function getPullRequestsForCommit({ context, commit }) {
  const branch = context.payload.branches.find(branch => branch.commit.sha === commit.sha)
  const { data: pullRequests } = await context.github.pullRequests.getAll(context.repo())

  return pullRequests
    .filter(pullRequest => pullRequest.head.ref === branch.name)
}

async function createPullRequestComment({ context }) {
  const ciBuildLink = url => `[Circle CI build](${url})`
  const commitLink = commit => '[`' + commit.sha.slice(0, 7) + '`](' + commit.html_url + ')'
  const commentHeader = ({ buildUrl, failedCommit }) => `### The ${ciBuildLink(buildUrl)} is failing as of ${commitLink(failedCommit)}.`
  const header = commentHeader({ buildUrl: context.payload.target_url, failedCommit: context.payload.commit })
  const logs = await getBuildLogs({ context })

  return header + '\n```' + logs + '\n```'
}

async function getBuildLogs({ context }) {
  const build = await getBuild({ context })

  if (!build) {
    return ''
  }

  const failed = build.steps
    .reduce((actions, step) => [...actions, ...step.actions], [])
    .find(action => action.failed)

  const logs = await fetch(failed.output_url).then(response => response.json())
  const logText = logs.reduce((text, log) => text + log.message, '')
  
  // NPM outputs unicode characters to color and format output
  // This looks weird in MarkDown, so we remove these characters
  const removeNonPrintables = text => text.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]\[\d+;?\d*m/g, '')

  return removeNonPrintables(logText)
}

async function getBuild({ context }) {
  const buildNumRegex = new RegExp(`${context.payload.name}/(\\d+)`)
  const matches = buildNumRegex.exec(context.payload.target_url)

  if (!matches) {
    return
  }

  const [username, project] = context.payload.name.split('/')
  const build_num = matches[1]

  return ci.getBuild({
    username,
    project,
    build_num
  })
}

function getValueFromConfig(config, key, defaultValue) {
  if (config && config[key] != undefined) {
    return config[key]
  }

  return defaultValue
}

module.exports = robot => {
  robot.on('status', async context => {
    if (!context.payload.state === 'failure') {
      return
    }

    const config = await getConfig(context, 'pull-request-monitor.yml')
    const failedPullRequests = await getFailedPullRequests({ context })
    const comment = await createPullRequestComment({ context })
    const issue = context.issue({ logger: robot.log })

    failedPullRequests.forEach(pullRequest => {
      context.github.issues.createComment({ ...issue, body: comment, number: pullRequest.number })
      context.github.issues.addLabels({ ...issue, number: pullRequest.number, labels: [getValueFromConfig(config, 'failedCiLabel', 'Failing CI')] })
    })
  })
}
