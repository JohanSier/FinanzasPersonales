import { createHash } from 'node:crypto'

export function movementIdentity(workspaceId: string, reference: string, suppliedId: string) {
  if (!/^(NOM|REC)-/.test(reference)) return suppliedId
  const hash = createHash('sha256').update(`${workspaceId}:${reference}`).digest('hex').slice(0, 32)
  return `TX-${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`.toUpperCase()
}
