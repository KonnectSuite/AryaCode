/** AryaCode occupants for the generic browser-brand slots. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { OfficialBrandMark, OfficialBrandName } from './Brand.tsx'

/** Required service: the UI slot registry. */
export const inject = ['slots']

/**
 * Fill the brand slots as one declaration-aware registration set: the sidebar
 * mark, the sidebar name, and the conversation hero mark.
 *
 * Upstream registers these only for the `official` build profile and leaves the
 * conversation hero on the shell's fish fallback. AryaCode is the product in
 * every build it produces, so the occupants are unconditional here and the hero
 * is claimed too - otherwise the shell draws a whale wherever a mark is missing.
 *
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', () =>
      ctx.slots.inject('conversation.hero.brand.mark', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, OfficialBrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, OfficialBrandName)
        yield ctx.slots.register({ name: 'conversation.hero.brand.mark', inject: () => ({ size: 34 }) }, OfficialBrandMark)
      })))
}
