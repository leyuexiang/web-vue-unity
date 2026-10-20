import { describe, expect, it } from 'vitest'
import { formatCurrentDateTime } from '../currentDateTime'

describe('formatCurrentDateTime', () => {
  it('以系统时间组件使用的格式补齐日期和时分秒', () => {
    const result = formatCurrentDateTime(new Date(2026, 0, 2, 3, 4, 5))

    expect(result).toEqual({
      date: '2026-01-02',
      time: '03:04:05',
      dateTime: '2026-01-02 03:04:05',
    })
  })
})
