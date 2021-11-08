const os = require('os')
const path = require('path')
const AutoGitUpdate = require('auto-git-update')

const config = {
  repository: 'https://github.com/crashmax-dev/twurple-bot',
  tempLocation: path.join(os.tmpdir(), 'twurple-bot'),
  ignoreFiles: []
}

const updater = new AutoGitUpdate(config)
updater.autoUpdate()