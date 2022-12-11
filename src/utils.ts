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

export const encodePassword = async (roomId: string, password: string) => {
  const data = new TextEncoder().encode(`${roomId}_${password}`)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  return window.btoa(String.fromCharCode(...bytes))
}
