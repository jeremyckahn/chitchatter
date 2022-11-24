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

export const isError = (e: any): e is Error => {
  return e instanceof Error
}
