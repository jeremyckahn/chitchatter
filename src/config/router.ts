import { RouterType } from '../models/router'

export const routerType: RouterType =
  (import.meta.env.VITE_ROUTER_TYPE as RouterType) || RouterType.BROWSER
