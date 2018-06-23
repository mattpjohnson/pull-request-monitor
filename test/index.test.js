const { Monitor } = require('../src/monitor')
const getConfig = require('probot-config')

jest.mock('probot-config')

describe('pull-request-monitor', () => {
  const github = {
    repos: { getContent: jest.fn() },
    issues: { createComment: jest.fn(), addLabels: jest.fn() },
    pullRequests: { getAll: jest.fn().mockResolvedValue({ data: [] }) }
  }
  const payload = {
    branches: [{ name: 'master' , commit: { sha: 'abc123'} }],
    commit: { sha: 'abc123' },
    name: 'mattpjohnson/pull-request-monitor',
    target_url: 'mattpjohnson/pull-request-monitor/1'
  }
  const context = {
    repo: jest.fn(),
    issue: jest.fn(),
    github,
    payload
  }

  const monitor = new Monitor(context)

  test('getValueFromConfig should return default value', async () => {
    getConfig.mockResolvedValue({})

    const defaultValue = 'Hello, World!'
    const val = await monitor.getValueFromConfig({ key: '', defaultValue })

    expect(val).toEqual(defaultValue)
  })

  test('getBuild should load build from the Circle CI API', async () => {
    const build = await monitor.getBuild()

    expect(build.build_num).toBe(1)
  })

  describe('markAllFailedPullRequests', async () => {
    const createResolverForPullRequests = pullRequests => ({ getAll: jest.fn().mockResolvedValue({ data: pullRequests }) })

    it('should not call createComment or addLabels if there are no pull requests', () => {
      const pullRequests = createResolverForPullRequests([])
      const monitor2 = new Monitor({ ...context, github: { ...context.github, pullRequests } })
      monitor2.markAllFailedPullRequests()

      expect(github.issues.createComment).not.toHaveBeenCalled()
      expect(github.issues.addLabels).not.toHaveBeenCalled()
    })

    it('should call createComment and addLabels once for each pull request', async () => {
      for (let i = 1; i < 3; i++) {
        const pullRequests = createResolverForPullRequests(
          Array(i)
            .fill()
            .map(item => ({ head: { ref: 'master' } }))
        )

        github.issues.createComment.mockClear()
        github.issues.addLabels.mockClear()

        const monitor3 = new Monitor({ ...context, github: { ...context.github, pullRequests } })
        await monitor3.markAllFailedPullRequests()

        expect(github.issues.createComment).toHaveBeenCalledTimes(i)
        expect(github.issues.addLabels).toHaveBeenCalledTimes(i)
      }
    })
  })
})
