# Phone editor and phone preview

## Phones get their own page, not a dialog

`/create` (`src/routes/create.tsx`) is the card-creation and card-editing form as a standalone route.
Below 768 px every entry point goes there instead of opening the studio dialog:

| Where                                | Desktop   | Phone                            |
| ------------------------------------ | --------- | -------------------------------- |
| Studio header, **Create invitation** | modal     | `/create?theme=…`                |
| Template card, tap a theme           | modal     | `/create?theme=…`                |
| Row action, **Edit**                 | modal     | `/create?card=<id>`              |
| `/cards/<id>` opened directly        | same page | redirects to `/create?card=<id>` |

The page owns its own frame — sticky title bar with a back button, step counter and Save; a single
scrolling body; and an action bar pinned to the bottom with `env(safe-area-inset-bottom)`. Its height
tracks `window.visualViewport` through `--create-page-height`, so when the phone keyboard opens the
action bar stays visible instead of sliding under it. The viewport meta adds
`interactive-widget=resizes-content` for Chrome on Android.

No dialog is mounted on a phone, so there is no portal, no scroll lock and no 96vw
centring maths to leave a stray pixel of overflow.

## The editor itself

The invitation editor is one component — `src/components/wedding/invitation-form.tsx` — mounted by
the `/create` page, the dashboard modal (`src/routes/dashboard.tsx`), the standalone card page
(`src/routes/cards.$id.tsx`) and the offline studio (`src/routes/offline-studio.tsx`). Below 768 px it
switches to a phone-only layout instead of shrinking the desktop modal.

## The form on a phone

- **Pinned chrome.** The step header and section rail share `.editor-mobile-head`, which sticks to the
  top of whatever scrolls; only the fields scroll.
- **Step header.** `.editor-mobile-step` shows `Step N of 8`, the section name and a progress track,
  plus a one-tap **Preview** jump.
- **Section rail.** `.editor-section-tabs` is a single horizontal rail of icon chips with
  `scroll-snap`; the active chip is scrolled into the centre whenever the section changes. The rail
  is sticky at the top of the scroll body.
- **One column.** Every `sm:grid-cols-*` grid inside a panel collapses; theme and layout choices stay
  a two-up grid of thumbnails, events/songs/gallery become single-column cards.
- **No iOS zoom, real targets.** Inputs, textareas and selects type at 16 px and are at least 44 px
  tall; every primary action is at least 44 px.
- **Sticky action bar.** `.dashboard-editor-footer` / `.editor-step-footer` is pinned to the bottom
  with `env(safe-area-inset-bottom)` padding: `Cancel` on the left, `Back` / `Next` / `Save` sharing
  the rest of the row.

## The preview on a phone

`src/components/platform/invitation-preview.tsx` always renders the invitation through
`/preview-frame`, which is an iframe at a real device width:

| Device  | Frame      | Behaviour                                |
| ------- | ---------- | ---------------------------------------- |
| Phone   | 390 × 844  | scaled to fit on desktop, 1:1 on a phone |
| Desktop | 1280 × 800 | scaled to fit, monitor-style chrome      |

On a phone (`usePhoneScreen`, `< 768 px`) the frame drops its bezel, notch and device switch and the
iframe fills the panel at 1:1 — the guest experience, not a picture of it. On desktop the phone mock
keeps a dark bezel and the Phone/Desktop switch in the toolbar, so a partner can check both.

Because the invitation lives in its own document, its media queries, sticky header and fixed backdrop
evaluate against a 390 px viewport, and they can never leak over the form.

## Checking it by hand

```
npm run dev -- --host 0.0.0.0 --port 8080
```

1. Open `/dashboard` on a phone (or DevTools device mode at 360–390 px), tap **Create invitation**.
   It must navigate to `/create` and no dialog should appear.
2. Confirm: the page fills the screen, the step header and chips stay pinned, the chips swipe, the
   step counter advances, no field or button is cut off, nothing scrolls sideways.
3. Type in a field — iOS Safari must not zoom in, and the action bar must stay above the keyboard.
4. Tap **Preview**: the invitation should render full-width at 1:1 and scroll on its own.
5. Repeat on `/cards/<id>` where the same editor is a page rather than a dialog.

`src/test/create-invitation-page.test.tsx` covers the page frame, step navigation, the 1:1 preview and
the back-to-studio escape. `src/test/invitation-interactions.test.tsx` and
`src/test/platform-dashboard.test.tsx` lock the structural behaviour: step header and rail at 390 px, no device switch on a phone, native preview with
no bezel, and the 1280 px frame on desktop.
