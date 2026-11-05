import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { appAuth } from '@/lib/app-auth'

export async function GET() {
  if (!(await appAuth.session()))
    return new Response('Inicia sesión para descargar tu respaldo.', {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  const buffer = await readFile(
    path.join(process.cwd(), 'src/private/Gastos-Personales-original.xlsx'),
  )
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Gastos-Personales-original.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  })
}
