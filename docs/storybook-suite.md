# Playable keepsakes

## Non-coder workflow

Use **Create invitation → Design → Quick theme selection** and choose **Royal Rajmahal**, **Lotus Goddess**, or **Calligraphy**. Fill the existing sections, upload the couple's portraits, add up to four extra events, choose soundtrack links, and publish. All existing card limits, publishing authorization, RSVP validation, guest-gallery read-only rules and private host dashboard continue to apply. These themes supply their own structure regardless of the legacy framework selection.

The public `/storybook?theme=royal-rajmahal` showcase (also `lotus-goddess` / `calligraphy`) includes a theme dropdown and simulated RSVP reactions. **It never saves replies.** Its content is explicitly sample content, not a real couple's card. Production invitations continue to use `/invite/<slug>`.

## Central JSON / props

`src/config/wedding.config.json` is the complete sample content contract. Replace the values, not the component code. It passes `invitationContentSchema`, the same schema used to publish cards. The title is passed separately; all other values are card content:

```tsx
import config from '@/config/wedding.config.json';
<PersonalInvitation title={config.title} content={config} cardId={card.id} slug={card.slug} />
```

The showcase imports this config; **existing or newly published customer cards are driven by their own database content, never this sample**. Shop owners edit these same data fields in the visual editor; they do not need to edit JSON or deploy code. Portraits use the existing compressed JPEG upload pipeline (under 180 KB), rather than arbitrary unvalidated URLs. `additionalEvents` contains title/date/time/venue/address; the main ceremony is appended automatically to the flip cards. No invented events appear when a host leaves them empty. `songs` accepts safe HTTPS links or same-origin `/audio/` files. The first track is the background soundtrack for these themes; the guest assistant can still answer questions about the configured playlist. Section visibility is controlled by `elements`.

## Components

`src/components/wedding/storybook/`:
- `entry.tsx`: envelope / keepsake box / tied scroll; pointer swipe, tap, keyboard; Framer Motion flap and seal, particle reveal, reduced-motion, focus loop and scroll restoration.
- `hero.tsx`: theme-specific art, names, blessing, date and chapter link. Mobile images remain uncropped.
- `living-motifs.tsx`: passive pointer listener, one animation-frame update, transform-only parallax; decorative elements never intercept touch.
- `scratch-story.tsx`: high-DPI bounded canvas; destination-out brush; coarse coverage grid instead of costly full-pixel reads; accessible reveal button and reset. Uploaded portraits are contained, not cropped. Only the canvas blocks touch scrolling while scratching.
- `flip-events.tsx`: keyboard/tap 3D keepsakes, aria-expanded, hidden reverse faces, optional synthesized knock.
- `venue-hunt.tsx`: architectural trail, lantern/date, pin/venue and directions, wardrobe/dress; explicit show-all for guests who prefer reading.
- `atmosphere.tsx`: single gesture-consented soundtrack, RSVP intersection volume/tempo lift, mute, background-tab pause and unmount cleanup. Existing music player is suppressed for these themes to prevent two concurrent soundtracks.
- `sound.ts`: short local Web Audio knock/chime, no network sound effects.
- `themes.ts`: narrow suite registry; CSS variables scope every panel to the selected theme.

The existing card-grounded `PersonalConcierge` gains a crowned character avatar that waves on opening; the existing chat, languages, prompts, server grounding and quotas remain. This is distinct from the admin-only Simran form assistant.

RSVP remains the existing real form and database insert. A successful **yes** triggers petals/gold particles and a consented chime; a successful **no** shows a falling leaf and a considerate acknowledgment. It never celebrates a failed submission. One-reply-per-device and name validation remain. The preview form validates a name but only shows a labelled demo response; it does not write to Supabase or mark the device as replied.

## Accessibility / performance

Targets ≥44 px, full-width phone layouts, keyboard alternatives to all gestures, `prefers-reduced-motion` support, no video, optimized WebP art (approximately 100–240 KB each), capped decorative elements, no continuous React state updates during parallax. Audio starts **only with consent and a gesture**; scroll alone never overrides browser policy or the mute control. No claim of a universal 60 fps guarantee: device/browser performance varies.

## Verification

TypeScript, production Vite build, complete Vitest suite, and browser smoke checks at 320, 390, 768 and 1440 px. Browser checks cover entry, scratch fallback, flip, venue reveal, demo RSVP, character chat and horizontal overflow. Automated tests cover registry/schema, section preservation, keyboard reveal, entry/scroll cleanup, flip state, hunt progression, no-autoplay and no-write demo RSVP.

## Sculptural 3D scenes

Each of the three keepsakes now includes `storybook/sculpture.tsx` in the hero and again between the story/gallery and event chapters. These are CSS 3D scenes, not flat generated illustrations: the palace has three five-sided volumes, projecting towers and individually hinged doors; the lotus has twenty independently angled petals arranged in two radial rings; the diya has a twelve-facet brass stem, a layered bowl, crossed flame planes and an articulated scroll. A perspective camera and idle orbit expose their depth. Pointer movement tilts the scene; the labelled keyboard-accessible button opens the palace, blooms the lotus or lights the diya. No new data fields or print-shop steps are required.

Animation pauses outside the viewport. Reduced-motion disables orbit, pollen, flickering and transitions without disabling the interactive states. Pointer tracking uses a single requestAnimationFrame; touch scrolling remains `pan-y`. Geometry stays in its own container, outside names, RSVP inputs and other hit targets. No WebGL dependency or remote 3D asset fetch is needed.
