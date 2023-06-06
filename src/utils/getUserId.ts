import type { HelixUser, HelixUserApi, UserNameResolvable } from '@twurple/api/lib'

type F = (userNames: UserNameResolvable[]) => Promise<HelixUser[]>

export async function getUsersData(UserApi: HelixUserApi, usernames: string[]){

  const userData = await UserApi.getUsersByNames(usernames.map((channel) => channel.replace('#','')))

  return userData.map((user) =>({ id: user.id, name: user.name }))
}
