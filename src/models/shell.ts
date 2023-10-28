import { AlertProps } from '@mui/material/Alert'

export type AlertOptions = Pick<AlertProps, 'severity'>

export enum QueryParamKeys {
  GET_SDK_CONFIG = 'getSdkConfig',
  IS_EMBEDDED = 'embed',
  PARENT_DOMAIN = 'parentDomain',
}
