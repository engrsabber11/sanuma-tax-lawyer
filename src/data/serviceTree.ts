import type { Service } from './types'

export interface ServiceNode {
  service: Service
  /** 0 for a top-level service, 1 for a sub-service. */
  depth: number
}

/**
 * Flattens the catalog into parent-then-children order so pickers can render
 * sub-services indented under the service they belong to.
 */
export function flattenServices(services: Service[]): ServiceNode[] {
  const nodes: ServiceNode[] = []
  for (const service of services) {
    if (service.parentId) continue
    nodes.push({ service, depth: 0 })
    for (const child of services) {
      if (child.parentId === service.id) nodes.push({ service: child, depth: 1 })
    }
  }
  // Orphans (parent deleted elsewhere) still belong in the list.
  for (const service of services) {
    if (service.parentId && !services.some((s) => s.id === service.parentId)) nodes.push({ service, depth: 0 })
  }
  return nodes
}
