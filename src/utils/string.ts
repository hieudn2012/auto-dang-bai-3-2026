import moment from "moment"

export const formatPostDate = (date: string) => {
  const now = moment()
  const itemDate = moment(date)
  const isLessThanOneDay = now.diff(itemDate, 'days') < 1

  if (isLessThanOneDay) {
    return `last ${itemDate.fromNow()}`
  }
  return itemDate.format('DD/MM/yyyy HH:mm:ss')
}

export const shortenString = (str: string, maxLength?: number) => {
  const length = maxLength ?? 10
  if (str.length <= length) return str
  return str.slice(0, length) + '...' + str.slice(-length)
}