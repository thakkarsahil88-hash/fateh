'use client'

import { useState, useEffect } from 'react'

const KEY = 'fateh_phone'

export function getStoredPhone(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function setStoredPhone(phone: string) {
  localStorage.setItem(KEY, phone)
}

export function usePhone() {
  const [phone, setPhoneState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setPhoneState(localStorage.getItem(KEY))
    setReady(true)
  }, [])

  function setPhone(p: string) {
    localStorage.setItem(KEY, p)
    setPhoneState(p)
  }

  return { phone, setPhone, ready }
}
