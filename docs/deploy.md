# Deploying

If you would like to run your own instance of this plugin, see the [docs for deploying plugins](https://github.com/probot/probot/blob/master/docs/deployment.md).

This plugin requires these **Permissions & events** for the GitHub App:

- Pull requests - **Read & Write**
- Single File - **Read-only**
  - Path: `.github/pull-request-monitor.yml`
- Commit Statuses - **Read-only**
  - [x] Check the box for **Status** events
