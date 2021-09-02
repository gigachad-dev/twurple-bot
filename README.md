## 1. Create a Twitch application

Go to your [Twitch developer console](https://dev.twitch.tv/console/apps) and create a new application. If you don't know what a Redirect URI is, use `http://localhost`. Write down Client ID and Client Secret somewhere - you're gonna need them!

## 2. Obtain an access token from Twitch

Visit this site, with the CLIENT_ID and REDIRECT_URI placeholders replaced with your client ID and redirect URI, respectively:

```
https://id.twitch.tv/oauth2/authorize?client_id=CLIENT_ID
  &redirect_uri=REDIRECT_URI
  &response_type=code
  &scope=chat:read+chat:edit+whispers:read+whispers:edit+channel:moderate+channel:read:editors+channel:manage:broadcast+user:read:broadcast+user:edit:broadcast
```

Log in with the account you want to use for your bot and confirm the access to Twitch. You should get redirected to your redirect URI with a query parameter named `code`.

Using a tool like [Insomnia](https://insomnia.rest) or [Postman](https://www.getpostman.com), make a `POST` request to this URL, again, with all placeholders replaced:

```
https://id.twitch.tv/oauth2/token?client_id=CLIENT_ID
  &client_secret=CLIENT_SECRET
  &code=CODE_FROM_LAST_REQUEST
  &grant_type=authorization_code
  &redirect_uri=REDIRECT_URI
```

The response body should look similar to the following:

```json
{
  "access_token": "79z6bpyc1spx0vfkgr5y1ic1qz4az9",
  "expires_in": 15645,
  "refresh_token": "msgned3ssyjikl8s6446y6fn247gdv6zv81g5cva5efqed4uok",
  "scope": [
    "channel:manage:broadcast",
    "channel:moderate",
    "channel:read:editors",
    "chat:edit",
    "chat:read",
    "whispers:edit",
    "whispers:read"
  ],
  "token_type": "bearer"
}
```

Create a `config.json` file similar to [`config.example.json`](config.example.json). Write the `accessToken`, `refreshToken`, `clientId` and `clientSecret` in `config.json`

## 4. Environment

Create a `.env` file similar to [`.env.example`](.env.example).

## 5. Running

```bash
npm install
npm start
```