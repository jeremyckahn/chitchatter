import { AlertProps } from '@mui/material/Alert'

export type AlertOptions = Pick<AlertProps, 'severity'>

export enum QueryParamKeys {
  IS_EMBEDDED = 'embed',
  WAIT_FOR_CONFIG = 'waitForConfig',
}
