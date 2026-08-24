import { Outlet } from 'react-router-dom'

/**
 * Shell mínimo de la aplicación. La navegación real (según `permissions[]`
 * del JWT) se agrega junto con auth (#5).
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <span className="text-lg font-semibold">AdminProp</span>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
