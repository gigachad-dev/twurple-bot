# 🤖 Twurple Bot

[![GitHub license](https://img.shields.io/badge/license-MIT-green.svg?label=License)](https://github.com/twurple/twurple/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/@twurple/auth.svg?style=flat&label=@twurple/auth)](https://www.npmjs.com/package/@twurple/auth)

# 🔨 Создание приложения разработчика Twitch

- Перейдите в [консоль приложения разработчика](https://dev.twitch.tv/console/apps) и зарегистрируйте новое приложение.
  
 [![](/docs/1.png)]()
 
 OAuth Redirect URL - `http://localhost:3030/twitch/callback`.
 - Нажмите на `Управление`.
  
 [![](/docs/2.png)]()

 - Сгенерируйте токены, нажав на кнопку `Новый секретный код`.

 [![](/docs/3.png)]()

# 📄 Создание конфига

Создайте в папке файл `config.json` подобный [`config.example.json`](config/config.example.json). 

Введите `clientId` и `clientSecret`, полученные выше.
Также, укажите канал, к которому будет подключен бот в `channels`.

Например:
 ```javascript
 {
  "channels": [
    "user0943831"
  ],
  "botOwners": [],
  "ignoreList": [
    "moobot",
    "mirrobot",
    "nightbot",
    "streamlabs",
    "restreambot",
    "streamelements"
  ],
  "server": {
    "hostname": "localhost",
    "port": 3030
  },
  "prefix": "!",
  "clientId": "O5U93Th2J5dQEgc5rEqzS4HLnkPWZNlN",
  "clientSecret": "AIzaSyBbw9O8K5DTLY1KQKfhv55v5GNe84g5Jy0",
  "accessToken": "",
  "refreshToken": ""
}
 ```

# 📌 Команды

<details><summary>Список доступных на данный момент команд</summary>

  <!-- no toc -->
- [aphorism](#!aphorism)
- [automod](#!automod)
- [cat](#!cat)
- [commands](#!commands)
- [eval](#!eval)
- [followage](#!followage)
- [game](#!game)
- [giphy](#!giphy)
- [heartstonedeck](#!heartstonedeck)
- [ignore](#!ignore)
- [join](#!join)
- [part](#!part)
- [pokemon](#!pokemon)
- [raid](#!raid)
- [sounds](#!sounds)
- [song](#!song)
- [command](#!command)
- [tts](#!tts)
- [title](#!title)
- [quote](#!quote)
- [uptime](#!uptime)
- [weather](#!weather)
- [youtube](#!youtube)
</details>

# ⚠ Интеграция с другими приложениями

Для корректной работы таких команд как `!giphy`, `!song`, `!youtube` и `!weather` нужно создать файл `.env` подобный `.env.example` и внести в него ваши ключи

Например:
```javascript
# https://nowplaying.tinyrobot.co
SPOTIFY_NOW_PLAYING_KEY=884f5b25-1ab5-4cee-b999-da448d8fab0e

# https://openweathermap.org/api
WEATHER_KEY=4b7f55a8e15af3ec5d463f83ce5dd419

# https://console.cloud.google.com/apis/credentials
YOUTUBE_KEY=AIzaSyBbw9O8K5DTLY1KQKfhv55v5GNe84g5Jy0

# https://developers.giphy.com/dashboard/
GIPHY_KEY=O5U93Th2J5dQEgc5rEqzS4HLnkPWZNlN

```

# ▶ Запуск бота

- Установите [Node.js](https://nodejs.org/en/)
- Установите зависимости командой `npm install`
- Для запуска используйте команду `npm start`
  

## `!aphorism`

- Случайный афоризм, цитата или фраза

```
usage: !афоризм
twurple: Ошибки всегда извинительны, когда имеешь силу в них признаться. Франсуа де Ларошфуко
```

## `!automod`

- Включает или выключает Automod

```
usage: !automod
twurple: AutoMod включен VoteYea
```
- добавляет или удаляет правило для Automod

```
usage: !automod remove Kappa
twurple: @le_xot, Правило добавлено
```
```
usage: !automod remove Kappa
twurple: @le_xot, Правило удалено
```
## `!cat`

- Случайная картинка котейки

```
usage: !кот
twurple: CoolCat cataas.com/cat/60ef3f0151a2ca0011c74560
```

## `!commands`

- Выводит список команд

```
usage: !команды
twurple: @username, Команды: !aphorism, !cat, etc..
```

## `!eval`

- Выполняет JS код

```
usage: !eval 2+2
twurple: 4
```

## `!followage`

- Время отслеживания канала

```
usage: !followage
twurple: @user, отслеживает канал с 7 сентября 2021 г. (52 день)
```
- проверяет продолжительность отслеживания конкретного пользователя

```
usage: !followage @user
twurple: @user отслеживает канал с 7 сентября 2021 г. (52 дня)
```

## `!game`

- Показывает текущий раздел стрима

```
usage: !игра
twurple: @user, <game>
```

- изменяет раздел стрима

```
usage: !игра <newGame>
twurple: @user, Игра изменена: <newGame>
```

## `!giphy`

- Поиск gif с сайта giphy.com

```
usage: !giphy
twurple: @user, Its Friday GIF by telenet → http://gph.is/27H8H5h
```
- в качестве поиска используется аргумент команды
```
usage: !giphy cat
twurple: @user, Dance Cat GIF by Banggood → http://gph.is/2chfxc6
```

## `!heartstonedeck`

- Декодирует колоду из Hearthstone

```
usage: AAECAf0EAuj3A/T8Aw7BuAPHzgPNzgOk0QP30QPU6gPQ7APR7AOn9wOu9wOy9wP8ngT9ngTonwQA
twurple: @user скинул колоду Мага для Стандартного формата: https://decklist.hsdeckviewer.com/Vvh8gS HSCheers
```

## `!ignore`

- Добавляет или убирает юзера из игнор-листа бота

```
usage: !ignore add @user
twurple: Пользователю @user запрещено использовать команды
```
```
usage: !ignore remove @user
twurple:  Пользователь @user удален из черного списка
```

## `!join`

- Включает бота на выбранном канале

```
usage: !join @user
twurple: Бот на канале @user успешно включен
```

## `!part`

- Отключает бота от выбранного канала

```
usage: !part @user
twurple: Бот на канале @user успешно отключен
```

## `!pokemon`

- Показывает случайного покемона

```
usage: !покемон
twurple: @user, А ты что за покемон? Ты Бронзор KomodoHype modpixelmon.ru/bronzor
```
- или даёт ссылку на вики конкретного 

```
usage: !покемон дитто
twurple: @user, Дитто: modpixelmon.ru/ditto
```

## `!raid`

- Проводит рейд на случайный канал из текущей категории

```
usage: !raid
twurple: Проводим рейд в количестве 25 зрителей на канал @user
```

## `!sounds`

- Воспроизведение звуков на стриме

```
usage: !звуки
twurple: @user, !погнали, !казино, etc..
```

## `!song`

- Показывает текущий проигрываемый трек со Spotify

```
usage: !song
twurple: Duck Sauce - aNYway
```
```
usage: !song
twurple: Музыка не проигрывается
```

## `!command`

  Эта команда позволяет управлять текстовыми командами.
- добавляет команды
```
usage: !command add twitter https://twitter.com/user
twurple: @user, Команда создана: !twitter
```
- удаляет созданные команды
```
usage: !command remove twitter
twurple: @user, Команда !twitter удалена
```
- выводит список созданных команд
```
usage: !command list
twurple: @user, Текстовые команды: !gametiers, !rules, etc..
```
- выводит информацию о команде
```
usage: !command get test
twurple: @user,Параметры: message - test, userlevel - everyone, sendType - reply
```
- меняет юзерлевел команды 
```
usage: !command userlevel test vip
twurple: @user, Уровень доступа обновлен: vip
```
- меняет тип отправки команды 
```
usage: !command sendtype test say
twurple: @user, Метод отправки сообщения обновлен: say
```

## `!tts`

- Воспроизводит написанный текст с помощью технологии Text-To-Speech.

```
usage: !tts Привет, я робот
```

## `!title`

- Показывает текущее название стрима

```
usage: !title
twurple: @user, <title>
```
- изменяет текущее название стрима

```
usage: !title <newTitle>
twurple: @user, Название стрима изменено: <newTitle>
```

## `!quote`

- Цитаты с сайта tproger

```
usage: !quote
twurple: #60: Думать или загуглить — вот в чем вопрос
```

## `!uptime`

Показывает длительность трансляции

```
usage: !uptime
twurple: @user вещает уже 2ч 1м 54сек
```

## `!weather`

Показывает погоду в указанном населённом пункте

```
usage: !погода Москва
twurple: @user, Москва 9°C Подробнее: openweathermap.org/city/524901
```

## `!youtube`

Поиск видео на ютуб прямо в чате

```
usage: !youtube daft punk
twurple: Daft Punk https://www.youtube.com/channel/UC_kRDKYrUlrbtrSiyu5Tflg
```
