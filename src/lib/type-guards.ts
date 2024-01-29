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

export const isErrorWithMessage = (e: unknown): e is { message: string } => {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof e.message === 'string'
  )
}
