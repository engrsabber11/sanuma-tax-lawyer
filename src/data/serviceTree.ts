import type { Service } from './types'

/**
 * The price a service bills at. A sub-service has no price of its own and
 * inherits the price of its parent service.
 */
export function effectivePrice(service: Service, services: Service[]): number {
  if (!service.parentId) return service.price
  return services.find((s) => s.id === service.parentId)?.price ?? 0
}

/**
 * How a service reads on its own, away from the catalog's visual nesting:
 * `Parent → Child` for a sub-service, plain name for a main one.
 */
export function serviceLabel(service: Service | undefined, services: Service[]): string {
  if (!service) return ''
  const parent = service.parentId ? services.find((s) => s.id === service.parentId) : undefined
  return parent ? `${parent.name} → ${service.name}` : service.name
}

export function serviceLabelById(id: string | undefined, services: Service[]): string {
  return serviceLabel(services.find((s) => s.id === id), services)
}

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
