import { describe, expect, it } from 'vitest'

import { isApplePlatform } from '../share'

const nav = (platform: string, userAgent: string) => ({ platform, userAgent })

describe('isApplePlatform', () => {
  it('detects iPhone, iPad (desktop mode) and Mac', () => {
    expect(isApplePlatform(nav('iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'))).toBe(true)
    expect(isApplePlatform(nav('MacIntel', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'))).toBe(true)
  })

  it('treats Android, Windows and Linux as non-Apple', () => {
    expect(isApplePlatform(nav('Linux armv8l', 'Mozilla/5.0 (Linux; Android 15; Pixel 9)'))).toBe(false)
    expect(isApplePlatform(nav('Win32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'))).toBe(false)
    expect(isApplePlatform(nav('Linux x86_64', 'Mozilla/5.0 (X11; Linux x86_64)'))).toBe(false)
  })
})
