import LogoSVG from './logo.svg'

type SVGType = React.FunctionComponent<
  React.SVGProps<SVGSVGElement> & { title?: string }
>

const Logo = LogoSVG as unknown as SVGType

export { Logo }
