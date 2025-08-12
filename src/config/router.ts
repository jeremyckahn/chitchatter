import { RouterType } from '../models/router'

let { VITE_ROUTER_TYPE } = import.meta.env

if (VITE_ROUTER_TYPE && !Object.values(RouterType).includes(VITE_ROUTER_TYPE)) {
  console.warn(`Invalid VITE_ROUTER_TYPE value: ${VITE_ROUTER_TYPE}`)

  VITE_ROUTER_TYPE = RouterType.BROWSER
}

export const routerType: RouterType =
  (VITE_ROUTER_TYPE as RouterType) || RouterType.BROWSER
