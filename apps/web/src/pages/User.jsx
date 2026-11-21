/**
 * Tab 4 (Perfil) — vacío a propósito en v2.
 * La estética se reconstruirá desde cero; no portar el flujo auth/stats del v1.
 */
export default function User() {
  return (
    <div className="user-tab-empty safe-bottom px-4 pt-10 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
      <p className="mt-2 text-sm opacity-60">
        Pantalla vacía — se diseñará de nuevo en Melodix v2.
      </p>
      <a
        href="/settings"
        className="mt-6 inline-flex text-sm font-medium underline underline-offset-4"
        style={{ color: 'var(--accent-color)' }}
      >
        Abrir ajustes (tema · acento · EQ)
      </a>
    </div>
  )
}
