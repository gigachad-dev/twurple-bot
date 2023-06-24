const TIMESPANS = {
  years: 31536000,
  months: 2592000,
  weeks: 604800,
  days: 86400,
  hours: 3600,
  minutes: 60,
  seconds: 1
}

export const dateDiff = (startDate: string | number | Date) => {
  if (Number.isNaN(new Date(startDate).valueOf())) {
    throw new Error('Invalid Date')
  }

  const formatDate = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(startDate))

  let timeDiff = Math.ceil((new Date().getTime() - new Date(startDate).getTime()) / 1000)

  const date = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  }

  Object.keys(TIMESPANS).forEach((i: keyof typeof TIMESPANS) => {
    date[i] = Math.floor(timeDiff / TIMESPANS[i])
    timeDiff -= date[i] * TIMESPANS[i]
  })

  const fullDays = Math.ceil(Math.abs(new Date().getTime() - new Date(startDate).getTime()) / 86400000)

  return {
    fullDays,
    formatDate,
    ...date
  }
}