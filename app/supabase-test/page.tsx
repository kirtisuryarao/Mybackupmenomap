import { createClient } from '@/utils/supabase/server'

export default async function SupabaseTestPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('todos').select('id, name').limit(20)

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-4 text-2xl font-semibold">Supabase Test</h1>
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
          Failed to load todos: {error.message}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Supabase Test</h1>
      <ul className="space-y-2">
        {data?.map((todo) => (
          <li key={todo.id} className="rounded-md border p-3">
            {todo.name}
          </li>
        ))}
      </ul>
    </main>
  )
}
