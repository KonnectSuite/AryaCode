// Single source of truth for brand copy. Artwork, tokens, and docs all read from here.
// Change a value here, then run `npm run check` to regenerate every asset.
export const brand = Object.freeze({
	name: 'AryaCode',
	upper: 'ARYACODE',
	slug: 'aryacode',
	tagline: 'Your AI coding companion',
	taglineUpper: 'YOUR AI CODING COMPANION',
	// The wordmark is split so the trailing word can carry the gradient accent.
	wordmarkLead: 'Arya',
	wordmarkTrail: 'Code'
});
