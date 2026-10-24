/** AryaCode occupants for the generic browser-brand slots. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { OfficialBrandMark, OfficialBrandName } from './Brand.tsx'

/** Required service: the UI slot registry. */
export const inject = ['slots']

/**
 * Fill the brand mark slots with the AryaCode mark: the sidebar rail and the
 * conversation hero.
 *
 * The name slot is deliberately left to the shell's fallback, which renders the
 * product name from `brand.localBuild`. The upstream occupant draws DeepSeek's
 * wordmark artwork and there is no AryaCode wordmark to replace it with, so
 * claiming that slot would put someone else's brand on the product.
 *
 * Upstream registers nothing outside the `official` profile, which is why a
 * non-official build fell back to the shell's whale. AryaCode is the product in
 * every build it produces, so these occupants are unconditional.
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
