export const sleep = (milliseconds: number): Promise<void> =>
  new Promise<void>(res => {
    setTimeout(res, milliseconds)
  })
