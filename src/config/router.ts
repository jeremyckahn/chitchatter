import { RouterType } from '../models/router'

const rawViteRouterType = import.meta.env.VITE_ROUTER_TYPE

let effectiveRouterType: RouterType | undefined =
  rawViteRouterType as RouterType

if (
  rawViteRouterType &&
  !Object.values(RouterType).includes(rawViteRouterType as RouterType)
) {
  console.warn(
    `Invalid VITE_ROUTER_TYPE value: "${rawViteRouterType}". Defaulting to "${RouterType.BROWSER}".`
  )
  effectiveRouterType = RouterType.BROWSER
}

export const routerType: RouterType = effectiveRouterType || RouterType.BROWSER
