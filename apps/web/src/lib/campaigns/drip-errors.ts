/** Thrown when a live drip run is stopped because consent or suppression could not be established (fail closed). */
export class DripSendBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DripSendBlockedError'
  }
}
