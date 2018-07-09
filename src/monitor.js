const fetch = require('node-fetch')
const getConfig = require('probot-config')

const CircleCI = require('circleci')
const ci = new CircleCI({
  auth: process.env.CIRCLE_CI_AUTH_TOKEN
})

class Monitor {
    constructor(context) {
        this.context = context
        this.failedCommit = context.payload.commit
        this.configPromise = getConfig(context, 'pull-request-monitor.yml')
    }

    async markAllFailedPullRequests() {
        const failedPullRequests = await this.getPullRequestsForFailedCommit()
        const comment = await this.createPullRequestComment()
        const issue = this.context.issue()
        const label = await this.getValueFromConfig({ key: 'failedCiLabel', defaultValue: 'Failing CI' })

        failedPullRequests.forEach(pullRequest => {
            this.context.github.issues.createComment({ ...issue, body: comment, number: pullRequest.number })
            this.context.github.issues.addLabels({ ...issue, number: pullRequest.number, labels: [label] })
        })
    }
    
    async getPullRequestsForFailedCommit() {
        const branches = this.context.payload.branches
        const branch = branches
            .find(branch => branch.commit.sha === this.failedCommit.sha)
        const { data: pullRequests } = await this.context.github.pullRequests.getAll(this.context.repo())
        
        return pullRequests
            .filter(pullRequest => pullRequest.head.ref === branch.name)
    }
    
    async createPullRequestComment() {
        const ciBuildLink = url => `[Circle CI build](${url})`
        const commitLink = commit => '[`' + commit.sha.slice(0, 7) + '`](' + commit.html_url + ')'
        const commentHeader = ({ buildUrl }) => `### The ${ciBuildLink(buildUrl)} is failing as of ${commitLink(this.failedCommit)}.`
        const header = commentHeader({ buildUrl: this.context.payload.target_url })
        const logs = await this.getBuildLogs()
        
        return header + '\n```' + logs + '\n```'
    }
    
    async getBuildLogs() {
        const build = await this.getBuild()
        
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
    
    async getBuild() {
        const buildNumRegex = new RegExp(`${this.context.payload.name}/(\\d+)`)
        const matches = buildNumRegex.exec(this.context.payload.target_url)

        if (!matches) {
            return
        }
        
        const [username, project] = this.context.payload.name.split('/')
        const build_num = matches[1]
        
        return ci.getBuild({
            username,
            project,
            build_num
        })
    }
    
    async getValueFromConfig({ key, defaultValue }) {
        const config = await this.configPromise
        if (config && config[key] != undefined) {
            return config[key]
        }
        
        return defaultValue
    }
}

module.exports = { Monitor }
