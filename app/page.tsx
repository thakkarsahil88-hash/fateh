import { redirect } from 'next/navigation'

// Root just sends to login — the login page checks localStorage client-side
export default function RootPage() {
  redirect('/login')
}
