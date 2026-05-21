import { describe, it, expect } from 'vitest'
import { verifyHospitalScope } from '../../../supabase/functions/lib/scope'

describe('verifyHospitalScope', () => {
  it('throws 400 when resolvedHospitalId is missing', () => {
    expect(() => verifyHospitalScope(null, 'h1')).toThrow()
    try {
      verifyHospitalScope(null, 'h1')
    } catch (e: any) {
      expect(e.status).toBe(400)
    }
  })

  it('throws 403 when jwtHospitalId is missing', () => {
    expect(() => verifyHospitalScope('h1', null)).toThrow()
    try {
      verifyHospitalScope('h1', null)
    } catch (e: any) {
      expect(e.status).toBe(403)
    }
  })

  it('throws 403 when mismatch', () => {
    expect(() => verifyHospitalScope('h1', 'h2')).toThrow()
    try {
      verifyHospitalScope('h1', 'h2')
    } catch (e: any) {
      expect(e.status).toBe(403)
    }
  })

  it('returns true when match', () => {
    expect(verifyHospitalScope('h1', 'h1')).toBe(true)
  })
})
