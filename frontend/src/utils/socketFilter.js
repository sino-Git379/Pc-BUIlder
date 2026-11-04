/**
 * Socket compatibility utility for RigForge Marketplace & PC Builder
 *
 * Requirements:
 * - When socketFilter is 'ALL', all items are compatible.
 * - When socketFilter is specific (e.g. 'AM5' or 'LGA1700'):
 *   - Components with an explicit socket must match the chosen socket.
 *   - Socket-dependent components without socket (CPUs or Motherboards) are excluded (no ambiguous results).
 *   - Non-socket-dependent components (GPUs, PSUs, Storage, Cases, RAM, universal accessories) are Universal.
 */

export function isSocketDependentKind(kind = '', name = '') {
  const k = String(kind).toLowerCase();
  const n = String(name).toLowerCase();
  return (
    k.includes('cpu') ||
    k.includes('processor') ||
    k.includes('motherboard') ||
    k.includes('board') ||
    n.includes('ryzen') ||
    n.includes('core i3') ||
    n.includes('core i5') ||
    n.includes('core i7') ||
    n.includes('core i9')
  );
}

export function isUniversalComponent(itemOrComp) {
  if (!itemOrComp) return true;
  const comp = itemOrComp.component || itemOrComp;
  const socket = (comp.socket || '').trim().toUpperCase();

  if (socket === 'UNIVERSAL' || socket === 'ALL' || socket === 'ANY') {
    return true;
  }

  const kind = comp.category_name || comp.category?.name || comp.kind || '';
  const isDependent = isSocketDependentKind(kind, comp.name || '');

  // If it's a CPU or Motherboard, it's not universal unless explicitly marked
  if (isDependent) {
    return false;
  }

  // If it has no socket or is non-dependent, it's universal
  return true;
}

export function isSocketCompatible(itemOrComp, socketFilter = 'ALL') {
  if (!socketFilter || socketFilter === 'ALL') {
    return true;
  }

  if (!itemOrComp) return false;
  const comp = itemOrComp.component || itemOrComp;
  const target = socketFilter.trim().toUpperCase();
  const socket = (comp.socket || '').trim().toUpperCase();
  const kind = comp.category_name || comp.category?.name || comp.kind || '';
  const name = (comp.name || '').toUpperCase();

  // 1. Explicit Universal socket
  if (socket === 'UNIVERSAL' || socket === 'ALL' || socket === 'ANY') {
    return true;
  }

  // 2. Component has explicit socket defined
  if (socket) {
    return socket.includes(target);
  }

  // 3. Component name mentions the socket
  if (name.includes('AM5') && target === 'AM5') return true;
  if ((name.includes('LGA1700') || name.includes('LGA 1700')) && target === 'LGA1700') return true;

  // 4. Socket-dependent components without socket are excluded to eliminate ambiguous results
  if (isSocketDependentKind(kind, comp.name || '')) {
    return false;
  }

  // 5. Non-socket dependent components (GPU, PSU, SSD, Case, RAM) are Universal
  return true;
}
