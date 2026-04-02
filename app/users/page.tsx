import DefaultLayout from "@/components/Layout/DefaultLayout"
import UsersPageClient from "@/components/users/UsersPageClient"
import { requireSession } from "@/lib/session"

export default async function UsersPage() {
  await requireSession()

  return (
    <DefaultLayout>
      <UsersPageClient />
    </DefaultLayout>
  )
}
