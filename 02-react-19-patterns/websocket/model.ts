interface TractorMessage {
  tractorId: string
  ts: number
  gps: {
    speedKph: number
    headingDeg: number
  }
  engine: {
    rpm: number
  }
  safety: {
    estopActive: boolean
  }
}