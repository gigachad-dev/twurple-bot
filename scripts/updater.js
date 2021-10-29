const path = require('path')
const AutoGitUpdate = require('auto-git-update')

const config = {
  repository: 'https://github.com/crashmax-dev/twurple-bot',
  tempLocation: path.join(__dirname, '../../.temp'),
  ignoreFiles: []
}

const updater = new AutoGitUpdate(config)
updater.autoUpdate()