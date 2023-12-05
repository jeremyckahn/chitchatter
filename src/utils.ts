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

// TODO: Move encryption utils into a service
export const encodePassword = async (roomId: string, password: string) => {
  const data = new TextEncoder().encode(`${roomId}_${password}`)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  return window.btoa(String.fromCharCode(...bytes))
}

// TODO: Make this configurable
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  )

  return keyPair
}

export const cryptoKeyStub: CryptoKey = {
  algorithm: { name: 'STUB-ALGORITHM' },
  extractable: false,
  type: 'private',
  usages: [],
}
