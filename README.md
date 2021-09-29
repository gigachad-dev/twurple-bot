## Создание Twitch приложения

Перейдите в [консоль разработчика Twitch](https://dev.twitch.tv/console/apps) и создайте новое приложение. Если вы не знаете, что такое OAuth Redirect URL перенаправления, то используйте `http://localhost:5500/twitch/callback`. Запишите где-нибудь идентификатор клиента (`clientId`) и секретный код клиента (`clientSecret`).

## Конфигурация

В папке `config` создайте файл `config.json`, аналогичный [`config.example.json`](/config/config.example.json). Заполните поля `clientId` и `clientSecret`.

## Запуск

 - Установите [NodeJS 14+](https://nodejs.org/en/)
 - Запустите установки зависимостей [`install.bat`](/install.bat)
 - Запуск бота [`start.bat`](/start.bat)