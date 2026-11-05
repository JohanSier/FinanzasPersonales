import { loadFinanceData } from '@/lib/claro/data'
import { getPayloadClient } from '@/lib/payload'

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
  try {
    const data = await loadFinanceData()
    if (data) return Response.json({ ok: true, data }, { headers })
    // Only reveal setup availability, never profile or financial information.
    const payload = await getPayloadClient()
    const owners = await payload.count({ collection: 'users', overrideAccess: true })
    return Response.json(
      { ok: false, signedOut: true, setupAvailable: owners.totalDocs === 0 },
      { status: 401, headers },
    )
  } catch {
    return Response.json(
      {
        ok: false,
        error: 'No pudimos conectar con tu base de datos. Tus datos no se han reemplazado.',
      },
      { status: 503, headers },
    )
  }
}
