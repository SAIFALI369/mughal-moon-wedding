# Mughal Moon Wedding

> AI concierge setup and deployment: [`docs/ai-concierge.md`](docs/ai-concierge.md)

---

## ✅ Copy-Paste This Entire Prompt Into Lovable:

```
Build a stunning, premium South Asian Muslim wedding invitation website for "Mohsin & Simran". It should feel luxurious, elegant, and cinematic — like a high-end wedding magazine spread brought to life on the web. Use React, Tailwind CSS, shadcn/ui components, Framer Motion for animations, and Lucide icons.

═══════════════════════════════════════
🎨 DESIGN SYSTEM & THEME
═══════════════════════════════════════

Color Palette:
- Primary: Deep Burgundy / Maroon (#6B1D2A)
- Secondary: Rich Gold (#C9A84C) with shimmer gradient effect
- Accent: Emerald Green (#1B5E3B)
- Background: Warm Ivory / Cream (#FDF8F0)
- Dark sections: Deep Charcoal (#1A1A2E)
- Text: Dark Brown (#3E2723) on light, Cream (#FDF8F0) on dark

Typography:
- Headings: Use an elegant serif font (Playfair Display or Cormorant Garamond from Google Fonts)
- Body: Clean sans-serif (Poppins or DM Sans)
- Arabic/Urdu calligraphy-style decorative text for "Bismillah" at the top

Overall Vibe:
- Luxurious, warm, romantic
- Gold foil textures and subtle grain overlays
- Soft floral SVG ornaments as section dividers (mandala, paisley, or Mughal-inspired geometric patterns)
- Subtle parallax scrolling effects
- Glassmorphism cards for event details

═══════════════════════════════════════
📐 SECTIONS (Top to Bottom)
═══════════════════════════════════════

1. **PRELOADER / INTRO ANIMATION**
   - A 2-3 second cinematic intro: gold particles converge to form the text "Mohsin & Simran" with a soft glow, then fades into the main site.
   - Use Framer Motion for this.

2. **HERO SECTION (Full Viewport)**
   - Full-screen with a soft radial gradient background (burgundy to dark).
   - Floating gold particle/sparkle animation in the background (use CSS or canvas).
   - Centered content:
     - "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ" in elegant calligraphy style at the top
     - "Together with their families" in small caps, gold
     - "Mohsin" in large serif on the left, an ornamental "&" or "weds" in the center, "Simran" in large serif on the right
     - Wedding date below: "Sunday, the Twenty-Second of November, Two Thousand Twenty-Six" in elegant spaced text
     - A subtle "Scroll Down" animated chevron at the bottom
   - Add a soft vignette overlay.

3. **COUNTDOWN TIMER**
   - A beautifully styled countdown to the wedding date.
   - Four flip-clock style cards: Days, Hours, Minutes, Seconds.
   - Gold borders, dark background, cream numbers.
   - Animate the number changes with a flip effect.
   - Label below: "Until We Say Qubool Hai"

4. **COUPLE INTRODUCTION / OUR STORY**
   - Two circular portrait frames side by side (use placeholder images with floral border rings).
   - Under each: Name, a short poetic line (e.g., "The calm to her storm" / "The spark to his soul").
   - Below: A short love story paragraph with a timeline of 3-4 milestones (Met → First Date → Proposal → Wedding) connected by a vertical gold dotted line with small diamond icons.
   - Fade-in-up animation as user scrolls into view.

5. **EVENT DETAILS (3 Cards)**
   - Three elegant glassmorphism cards in a row (stack on mobile):
     a) **Nikah Ceremony** — Date, Time, Venue name, Address, Dress Code
     b) **Barat / Reception** — Date, Time, Venue, Address, Dress Code
     c) **Walima** — Date, Time, Venue, Address, Dress Code
   - Each card has:
     - A small gold icon at the top (mosque, rings, feast)
     - Ornamental gold corner decorations (CSS pseudo-elements)
     - A "Get Directions" button linking to Google Maps
     - A subtle hover lift + glow effect
   - Background: soft cream with a faint mandala watermark.

6. **GALLERY SECTION**
   - A masonry/grid photo gallery of the couple (use 6-8 placeholder images).
   - On hover: slight zoom + gold border glow.
   - On click: lightbox/modal opens with the full image (use shadcn Dialog).
   - Section title: "Moments of Us" in large serif with a gold underline ornament.

7. **DRESS CODE SECTION**
   - Elegant section with color swatches showing the suggested palette for guests.
   - For Men: "Traditional Sherwani or Formal Suit" with color dots
   - For Women: "Formal Eastern / Lehenga / Gown" with color dots
   - Use small circular color swatches (burgundy, gold, emerald, navy).

8. **RSVP SECTION**
   - A beautiful form with fields:
     - Full Name
     - Number of Guests (dropdown 1-5)
     - Attending Which Events? (checkboxes: Nikah, Barat, Walima)
     - Dietary Restrictions (text)
     - A heartfelt message for the couple (textarea)
   - Submit button: "Send Your Wishes" with a gold gradient and hover shimmer.
   - On submit: show a confetti animation + "Thank You! We can't wait to celebrate with you 💛" toast/message.
   - Background: deep burgundy with gold text.

9. **VENUE MAP**
   - Embedded Google Maps iframe (use a placeholder location).
   - Styled with a gold ornamental frame/border around the map.
   - Venue name and address below.

10. **FOOTER**
    - A warm closing message: "We look forward to celebrating this beautiful beginning with you."
    - "Mohsin & Simran" in large script.
    - Wedding hashtag: #MohsinWedsSimran
    - Small social media icons (Instagram, WhatsApp).
    - "Made with ❤️" at the very bottom.
    - Background: dark charcoal with gold accents.

═══════════════════════════════════════
✨ ANIMATIONS & INTERACTIONS
═══════════════════════════════════════

- Use Framer Motion for all scroll-triggered animations (fade-in-up, scale-in, stagger children).
- Gold sparkle/particle effect in the hero (CSS keyframes or a lightweight canvas).
- Smooth scroll behavior throughout.
- Parallax effect on hero background.
- Hover micro-interactions on all buttons and cards (scale, glow, color shift).
- Section dividers: animated SVG floral/mandala ornaments that draw themselves on scroll (use SVG stroke-dasharray animation).

═══════════════════════════════════════
📱 RESPONSIVE DESIGN
═══════════════════════════════════════

- Fully responsive: mobile-first approach.
- On mobile: stack all cards vertically, reduce font sizes gracefully, hero names stack vertically.
- Touch-friendly buttons and form inputs.
- Hamburger menu if navigation is added.
- Countdown cards should be 2x2 grid on mobile.

═══════════════════════════════════════
🎵 BONUS FEATURES (if possible)
═══════════════════════════════════════

- A floating music toggle button (bottom-right) that plays soft instrumental/Qawwali background music (use a placeholder audio URL). Show a spinning vinyl icon when playing.
- A "Save the Date" button that downloads a .ics calendar file.
- Dark/Light mode toggle (default: light warm theme).

═══════════════════════════════════════

Make the entire site feel like a premium, cinematic wedding experience. Every detail should feel intentional and luxurious. Prioritize smooth animations, beautiful typography, and a cohesive gold-burgundy-cream color story throughout.
```

---

## 💡 Tips After Generating:

| Step  | What to Do                                                |
| ----- | --------------------------------------------------------- |
| **1** | Paste the prompt into Lovable and hit generate            |
| **2** | Replace placeholder images with real couple photos        |
| **3** | Update dates, times, and venue addresses                  |
| **4** | Swap the placeholder Google Maps link with the real venue |
| **5** | Add a real audio file URL for the music toggle            |
| **6** | Tweak colors if needed using Lovable's follow-up chat     |

This prompt will produce a **far more polished, animated, and feature-rich** card than a basic template — with cinematic intro, countdown, glassmorphism cards, masonry gallery, RSVP with confetti, and a cohesive luxury design system. 🎉

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mughal-moon-wedding.vercel.app

## Hosting

The app is hosted on **Vercel** (TanStack Start SSR) with **Supabase** for Postgres, Auth, Realtime and the `wedding-concierge` Edge Function.

- Supabase project: `ibqkslwleelhijhujjcm` — `https://ibqkslwleelhijhujjcm.supabase.co`
- Vercel project: `mughal-moon-wedding`
- Full runbook (schema, env vars, Edge Function secrets, deployment, smoke tests): [docs/hosting.md](docs/hosting.md)

```sh
# Apply database migrations when you have the database password
export LOVABLE_DB_MIGRATION_URL="postgresql://postgres:[password]@db.ibqkslwleelhijhujjcm.supabase.co:5432/postgres"
npm run db:migrate
```

**Personal invitation builder and private RSVPs**: See [the creator and migration guide](docs/personal-invitations.md). The original moonlit invitation is the default, with independent theme and layout choices. Every published card also gets its own AI host assistant, named after the host, plus a host-chosen soundtrack of up to five songs. The invitation suite has been redesigned with ornate arches, monograms, a cover keepsake, a date plate and a celebration timeline.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/346fdd90-46fa-4cae-8bdb-d804666b024c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
