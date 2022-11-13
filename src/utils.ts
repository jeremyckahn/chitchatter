export const sleep = (milliseconds: number): Promise<void> =>
  new Promise<void>(res => {
    setTimeout(res, milliseconds)
  })

export const isRecord = (variable: any): variable is Record<string, any> => {
  return (
    typeof variable === 'object' &&
    !Array.isArray(variable) &&
    variable !== null
  )
}
