# Twurple Bot

[![GitHub license](https://img.shields.io/badge/license-MIT-green.svg?label=License)](https://github.com/twurple/twurple/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/@twurple/auth.svg?style=flat&label=@twurple/auth)](https://www.npmjs.com/package/@twurple/auth)
![GitHub package.json version](https://img.shields.io/github/package-json/v/crashmax-dev/twurple-bot?label=Twurple%20Bot)

## 1. Create a Twitch application

Go to your [Twitch developer console](https://dev.twitch.tv/console/apps) and create a new application. If you don't know what a Redirect URI is, use `http://localhost:3030/twitch/callback`. Write down Client ID and Client Secret somewhere - you're gonna need them!

## 2. Create config file & environment

Create a `config.json` file similar to [`config.example.json`](config/config.example.json). Write the `clientId` and `clientSecret`
Create a `.env` file similar to [`.env.example`](.env.example)

## 3. Running

```bash
npm install
npm start
```