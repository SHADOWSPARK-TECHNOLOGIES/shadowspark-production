import { AsyncLocalStorage } from "node:async_hooks";

type TenantStore = {
  tenantId: string;
};

const tenantStore = new AsyncLocalStorage<TenantStore>();

export function runWithTenantContext<T>(tenantId: string, handler: () => Promise<T>): Promise<T> {
  return tenantStore.run({ tenantId }, handler);
}

export function getTenantContextId(): string | null {
  const store = tenantStore.getStore();
  return store?.tenantId ?? null;
}
