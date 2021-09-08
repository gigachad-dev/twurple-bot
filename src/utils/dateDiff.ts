export const dateDiff = (startDate: string | number | Date) => {
  let difference = (Date.now() - new Date(startDate).getTime()) / 1000

  const timespans = {
    years: 31536000,
    months: 2592000,
    weeks: 604800,
    days: 86400,
    hours: 3600,
    minutes: 60,
    seconds: 1
  }

  const date: Record<string, number> = {}

  Object.keys(timespans).forEach((i: keyof typeof timespans) => {
    date[i] = Math.floor(difference / timespans[i])
    difference -= date[i] * timespans[i]
  })

  return date
}