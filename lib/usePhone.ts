'use client'

import { useState, useEffect } from 'react'

const KEY = 'fateh_uid'

export function getStoredPhone(): string | null {
  if (typeof window === 'undefined') return null
  let uid = localStorage.getItem(KEY)
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem(KEY, uid)
  }
  return uid
}

export function setStoredPhone(phone: string) {
  localStorage.setItem(KEY, phone)
}

export function usePhone() {
  const [phone, setPhoneState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setPhoneState(getStoredPhone())
    setReady(true)
  }, [])

  function setPhone(p: string) {
    localStorage.setItem(KEY, p)
    setPhoneState(p)
  }

  return { phone, setPhone, ready }
}
