/** Presentation the brand slots hand to their occupant. */
export interface BrandMarkProps {
  /** Square edge length in logical pixels. */
  readonly size?: number | undefined
  /** Host class for layout or hiding the mark in a given surface. */
  readonly className?: string | undefined
}

/**
 * Wordmark geometry: 'AryaCode' drawn from Sora, the brand kit's primary face,
 * as vector paths. 'Arya' is one run and 'Code' the second, matching how the kit
 * splits its own wordmark between a plain first word and a gradient accent.
 */
const WORDMARK_VIEWBOX = '-1.2 -79 492.8 103.8'
const WORDMARK_OFFSET = 222.3
const WORDMARK_ASPECT = 4.7476
const WORDMARK_ARYA = 'M12.60 0L2.80 0L29.10-73L45.70-73L72.80 0L62.70 0L38.20-66.60L43-64.20L31.20-64.20L36.30-66.60L12.60 0ZM56.60-21.80L18.50-21.80L21.80-30.60L53.30-30.60L56.60-21.80ZM91.90 0L82.30 0L82.30-53.40L89.90-53.40L89.90-31.40L89.50-31.40Q89.50-43.10 94.65-48.55Q99.80-54 110.10-54L110.10-54L111.90-54L111.90-45.40L108.50-45.40Q100.50-45.40 96.20-41.15Q91.90-36.90 91.90-28.90L91.90-28.90L91.90 0ZM124.30 20.80L117.20 20.80L117.20 12.20L124.90 12.20Q128.30 12.20 130.65 11.35Q133 10.50 134.55 8.50Q136.10 6.50 137.10 3.20L137.10 3.20L153.90-53.40L163.30-53.40L145.50 5.70Q143.90 11 141 14.35Q138.10 17.70 133.95 19.25Q129.80 20.80 124.30 20.80L124.30 20.80ZM145.10-1.20L133.50-1.20L133.50-9.20L145.10-9.20L145.10-1.20ZM141.50-1.20L132.50-1.20L113.40-53.40L123.20-53.40L141.50-1.20ZM212.90 0L205.30 0L205.30-16L203.70-16L203.70-34.50Q203.70-40 200.85-42.80Q198-45.60 192.50-45.60L192.50-45.60Q189.40-45.60 186.10-45.50Q182.80-45.40 179.80-45.30Q176.80-45.20 174.60-45L174.60-45L174.60-53.40Q176.80-53.60 179.25-53.75Q181.70-53.90 184.30-53.95Q186.90-54 189.30-54L189.30-54Q197.50-54 202.70-52.05Q207.90-50.10 210.40-45.70Q212.90-41.30 212.90-33.80L212.90-33.80L212.90 0ZM187.80 1.40L187.80 1.40Q181.80 1.40 177.45-0.65Q173.10-2.70 170.75-6.60Q168.40-10.50 168.40-16L168.40-16Q168.40-21.70 170.95-25.50Q173.50-29.30 178.40-31.25Q183.30-33.20 190.20-33.20L190.20-33.20L204.70-33.20L204.70-26L189.80-26Q184-26 180.90-23.20Q177.80-20.40 177.80-16L177.80-16Q177.80-11.60 180.90-8.90Q184-6.20 189.80-6.20L189.80-6.20Q193.20-6.20 196.30-7.45Q199.40-8.70 201.45-11.65Q203.50-14.60 203.70-19.80L203.70-19.80L206.30-16Q205.80-10.30 203.55-6.45Q201.30-2.60 197.35-0.60Q193.40 1.40 187.80 1.40Z'
const WORDMARK_CODE = 'M42.30 1.80L42.30 1.80Q32.30 1.80 25.25-1.70Q18.20-5.20 13.90-10.80Q9.60-16.40 7.60-22.95Q5.60-29.50 5.60-35.60L5.60-35.60L5.60-37.80Q5.60-44.40 7.65-51Q9.70-57.60 14-63Q18.30-68.40 25.20-71.70Q32.10-75 41.70-75L41.70-75Q51.50-75 58.50-71.60Q65.50-68.20 69.60-62.10Q73.70-56 74.60-47.70L74.60-47.70L64.60-47.70Q63.80-53.90 60.60-57.95Q57.40-62 52.55-64Q47.70-66 41.70-66L41.70-66Q35.20-66 30.30-63.75Q25.40-61.50 22.15-57.45Q18.90-53.40 17.25-48.10Q15.60-42.80 15.60-36.60L15.60-36.60Q15.60-30.70 17.25-25.40Q18.90-20.10 22.25-16Q25.60-11.90 30.60-9.55Q35.60-7.20 42.30-7.20L42.30-7.20Q51.70-7.20 58.10-11.90Q64.50-16.60 65.90-25.50L65.90-25.50L75.90-25.50Q74.90-18 70.85-11.80Q66.80-5.60 59.65-1.90Q52.50 1.80 42.30 1.80ZM110.80 1.80L110.80 1.80Q103.80 1.80 98.50-0.60Q93.20-3 89.55-6.95Q85.90-10.90 84.05-15.80Q82.20-20.70 82.20-25.80L82.20-25.80L82.20-27.60Q82.20-32.70 84.10-37.65Q86-42.60 89.70-46.55Q93.40-50.50 98.70-52.85Q104-55.20 110.80-55.20L110.80-55.20Q117.60-55.20 122.90-52.85Q128.20-50.50 131.90-46.55Q135.60-42.60 137.50-37.65Q139.40-32.70 139.40-27.60L139.40-27.60L139.40-25.80Q139.40-20.70 137.55-15.80Q135.70-10.90 132.05-6.95Q128.40-3 123.10-0.60Q117.80 1.80 110.80 1.80ZM110.80-6.80L110.80-6.80Q116.80-6.80 121.05-9.45Q125.30-12.10 127.55-16.60Q129.80-21.10 129.80-26.70L129.80-26.70Q129.80-32.40 127.50-36.90Q125.20-41.40 120.95-44Q116.70-46.60 110.80-46.60L110.80-46.60Q105-46.60 100.70-44Q96.40-41.40 94.10-36.90Q91.80-32.40 91.80-26.70L91.80-26.70Q91.80-21.10 94.05-16.60Q96.30-12.10 100.55-9.45Q104.80-6.80 110.80-6.80ZM173.60 1.80L173.60 1.80Q167.90 1.80 163.10-0.30Q158.30-2.40 154.75-6.20Q151.20-10 149.25-15Q147.30-20 147.30-25.80L147.30-25.80L147.30-27.60Q147.30-33.30 149.20-38.30Q151.10-43.30 154.55-47.10Q158.00-50.90 162.75-53.05Q167.50-55.20 173.30-55.20L173.30-55.20Q179.40-55.20 184.40-52.65Q189.40-50.10 192.60-44.70Q195.80-39.30 196.20-30.70L196.20-30.70L192.20-37.10L192.20-73L201.80-73L201.80 0L194.20 0L194.20-23.70L197.00-23.70Q196.60-14.60 193.20-8.95Q189.80-3.30 184.65-0.75Q179.50 1.80 173.60 1.80ZM174.90-6.60L174.90-6.60Q179.80-6.60 183.80-8.80Q187.80-11 190.20-15.15Q192.60-19.30 192.60-24.90L192.60-24.90L192.60-29.50Q192.60-35 190.15-38.85Q187.70-42.70 183.65-44.75Q179.60-46.80 174.80-46.80L174.80-46.80Q169.50-46.80 165.45-44.30Q161.40-41.80 159.15-37.30Q156.90-32.80 156.90-26.70L156.90-26.70Q156.90-20.60 159.20-16.05Q161.50-11.50 165.60-9.05Q169.70-6.60 174.90-6.60ZM240.40 1.80L240.40 1.80Q233.40 1.80 228.30-0.60Q223.20-3 220-6.95Q216.80-10.90 215.25-15.80Q213.70-20.70 213.70-25.80L213.70-25.80L213.70-27.60Q213.70-32.80 215.25-37.70Q216.80-42.60 220-46.55Q223.20-50.50 228.15-52.85Q233.10-55.20 239.80-55.20L239.80-55.20Q248.50-55.20 254.15-51.45Q259.80-47.70 262.55-41.80Q265.30-35.90 265.30-29.20L265.30-29.20L265.30-24.90L217.90-24.90L217.90-32.10L258.30-32.10L256.10-28.20Q256.10-33.90 254.30-38.05Q252.50-42.20 248.90-44.50Q245.30-46.80 239.80-46.80L239.80-46.80Q234.10-46.80 230.35-44.20Q226.60-41.60 224.75-37.10Q222.90-32.60 222.90-26.70L222.90-26.70Q222.90-21 224.75-16.45Q226.60-11.90 230.50-9.25Q234.40-6.60 240.40-6.60L240.40-6.60Q246.70-6.60 250.65-9.40Q254.60-12.20 255.40-15.90L255.40-15.90L264.40-15.90Q263.30-10.40 260-6.40Q256.70-2.40 251.70-0.30Q246.70 1.80 240.40 1.80Z'

const MARK_VIEWBOX = '0 0 512 512'

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
export function OfficialBrandMark({ size = 24, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      role="img"
      aria-label="AryaCode"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="arya-code-frame" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8A5CFF" />
          <stop offset="0.32" stopColor="#2B6CFF" />
          <stop offset="1" stopColor="#00E0D2" />
        </linearGradient>
        <linearGradient id="arya-code-letter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6E8EB" />
          <stop offset="1" stopColor="#E6E8EB" stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#2B6CFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M106 164H66L50 148H30" /><path d="M106 212H50" /><path d="M106 260H28" /><path d="M106 308H60L44 324H24" />
        <path d="M406 164H446L462 148H482" /><path d="M406 212H462" /><path d="M406 260H484" /><path d="M406 308H452L468 324H488" />
      </g>
      <g fill="#0F141B" stroke="#2B6CFF" strokeWidth="8">
        <circle cx="28" cy="148" r="9" /><circle cx="50" cy="212" r="9" /><circle cx="28" cy="260" r="9" /><circle cx="22" cy="324" r="9" />
        <circle cx="484" cy="148" r="9" /><circle cx="462" cy="212" r="9" /><circle cx="484" cy="260" r="9" /><circle cx="490" cy="324" r="9" />
      </g>
      <path d="M188 446V392L90 336V144L256 48L422 144V336L324 392V446" fill="none" stroke="url(#arya-code-frame)" strokeWidth="40" strokeLinejoin="miter" />
      <path d="M256 104L366 168V304L256 368L146 304V168Z" fill="#0F141B" />
      <path d="M256 120L358 348H304L282 296H230L208 348H154ZM256 204L233 260H279Z" fill="url(#arya-code-letter)" fillRule="evenodd" />
    </svg>
  )
}

/**
 * Render the AryaCode wordmark for the sidebar name slot.
 *
 * 'Arya' is painted with currentColor so the host theme decides whether it is
 * dark or light; 'Code' keeps the brand gradient, which reads on both.
 *
 * @param props - Host-supplied presentation.
 * @returns the AryaCode wordmark.
 */
export function OfficialBrandName({ size = 20, className }: BrandMarkProps) {
  return (
    <svg
      height={size}
      width={size * WORDMARK_ASPECT}
      viewBox={WORDMARK_VIEWBOX}
      role="img"
      aria-label="AryaCode"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="arya-code-word" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2B6CFF" />
          <stop offset="1" stopColor="#00E0D2" />
        </linearGradient>
      </defs>
      <path d={WORDMARK_ARYA} fill="currentColor" />
      <path d={WORDMARK_CODE} transform={'translate(' + WORDMARK_OFFSET + ' 0)'} fill="url(#arya-code-word)" />
    </svg>
  )
}
