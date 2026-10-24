import { BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the AryaCode mark with the presentation requested by its host surface.
 *
 * The artwork is the mark from the AryaAI brand kit (logos/mark-light-background.svg):
 * a gradient hex frame around the A. It is inlined rather than imported so the
 * product carries the brand kit asset unchanged and needs no asset resolution in
 * either surface.
 *
 * @param props - Host-supplied mark presentation.
 * @returns the AryaCode mark.
 */
export function OfficialBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="AryaCode"
      focusable="false"
    >
      <defs>
        <linearGradient id="arya-code-frame" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8A5CFF" />
          <stop offset="0.32" stopColor="#2B6CFF" />
          <stop offset="1" stopColor="#00E0D2" />
        </linearGradient>
      </defs>
      <path
        d="M188 446V392L90 336V144L256 48L422 144V336L324 392V446"
        fill="none"
        stroke="url(#arya-code-frame)"
        strokeWidth="40"
        strokeLinejoin="miter"
      />
      <path
        d="M256 120L358 348H304L282 296H230L208 348H154ZM256 204L233 260H279Z"
        fill="#171D26"
        fillRule="evenodd"
      />
    </svg>
  )
}

/**
 * Render the official name artwork without its independently slotted mark.
 * @returns the official name wordmark.
 */
export function OfficialBrandName() {
  return <BrandWordmark includeMark={false} />
}
