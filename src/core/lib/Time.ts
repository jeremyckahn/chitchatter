export class Time {
  now = () => {
    return Date.now()
  }
}

export const time = new Time()
