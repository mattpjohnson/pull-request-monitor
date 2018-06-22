# pull-request-monitor

> A GitHub App built with [Probot](https://github.com/probot/probot) that helps debug pull requests with failing Circle CI builds.

## Solution

1. Capture failing events
2. Get the commit from the failed event
3. Use Circle CI API to get error log for event
4. Get all pull requests (if any) that contain the commit
5. Loop through all pull requests and create a comment with the log information

## Challenges

1. My initial question when dealing with this project was how much work, if any, needs to be done CI side? Can the GitHub API provide the error log? I wasn't able to find error details in any of the endpoints I tested in the GitHub API, so I resorted to loading the error logs from Circle CI.
2. I needed an efficient way to get the pull request(s) for the failed commit. I initially started down the path of filtering all pull requests and then loading their commits and checking if these commits contained the commit I was searching for. I dropped this idea since it was inefficient. My final solution was to get the branch name off of the commit, and then filter pull requests for that branch.
3. Creating a comment on a pull request requires a [file path and position (line)](https://octokit.github.io/rest.js/#api-PullRequests-createComment). I needed to create a comment on the entire pull request, not just one for a particular line in a file. The solution was to create the comment using the [issue api](https://octokit.github.io/rest.js/#api-Issues-createComment).

## Usage

1. Configure the GitHub App
2. Create `.github/pull-request-monitor.yml` based on the following template.
3. Create PR's with failing Circle CI tests :)

```yml
# Label to add when pull request fails. Set to `false` to disable
failedCiLabel: "Failed CI"
```

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Deployment

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this plugin.

## Contributing

If you have suggestions for how pull-request-monitor could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2018 Matt Johnson <matt@mattpjohnson.com> (https://github.com/mattpjohnson/pull-request-monitor)
