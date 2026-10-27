# Live preview and in-place editing

`/preview/$cardId` (`src/routes/preview.$cardId.tsx`) shows the invitation exactly as a guest sees it —
full screen, at a real 390 × 844 phone viewport — and lets the host change it there and then.

## Why it exists

A modal cannot hold a phone-sized invitation plus a form without fighting the viewport, and on a
phone the old preview dialog opened wider than the screen. On a phone, **Preview** in the studio now
navigates here (`dashboard.tsx#openPreview`); on desktop the dialog stays and offers **Edit live**.

## What can be edited

| Control                                          | Opens                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tap anywhere inside the invitation               | the matching section (hero/venue → Details, story → Story, schedule → Events, gallery → Photos, RSVP/share → Elements, backdrop → Theme) |
| Dock → Details / Story / Events / Photos / Music | that form section, live                                                                                                                  |
| Dock → Theme                                     | the theme rail with moving film previews                                                                                                 |
| Dock → Elements                                  | the on/off switches for every invitation section                                                                                         |

Everything writes to the same `InvitationForm` state the card is saved from, and every keystroke is
pushed into the preview iframe over `postMessage`, so the invitation behind the sheet updates live.

Tap mapping lives in `src/lib/invitation-tap-map.ts` (`sectionForInviteTap`), keyed off the
`invite-suite-*` blocks the template renders.

## Saving

`Save` (header) and `Save changes` (sheet) validate with `invitationContentSchema`, then:

- cloud card → `invitation_cards` update, verified with `.select().maybeSingle()`; zero rows is
  reported instead of pretending it saved.
- offline draft → `updateOfflineDraft`.
- published cards keep the locked couple identity (`preserveLockedCoupleIdentity`); the sheet explains
  why in a note.
