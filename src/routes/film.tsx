import { createFileRoute } from "@tanstack/react-router";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

/**
 * Mughal Moon — The Film, as a shareable premiere.
 *
 * This route exists so the cinematic theme can be watched end to end before a
 * partner assigns it to a card: the poster, the twenty-second film, the
 * scroll-scrubbed stage and the card itself. It is a demo card, exactly like
 * `/demo` — a host's own film lives at their own `/invite/<slug>` link.
 */
const filmCard = {
  groomName: "Mohsin",
  brideName: "Simran",
  date: "22/11/2026",
  time: "7:30 PM IST",
  endTime: "11:30 PM IST",
  venue: "The Mughal Gardens",
  address: "New Delhi, India",
  eventType: "Nikah & Walima",
  hosts: "Together with our families",
  hostName: "The Khan & Sharma families",
  message:
    "Some nights are written in the stars, and this one has been waiting for you. Come sit under the lanterns with us, share a plate, a song and a blessing, and watch two families become one.",
  story:
    "We met in a bookshop in Patna, both reaching for the same worn copy of a ghazal collection. One conversation became a thousand, and somewhere between chai at midnight and long walks by the river, we found home. Now our favourite chapter begins — and we would like you beside us when it does.",
  dressCode: "Festive Indian wear in ivory, deep green or antique gold",
  contactName: "Imran Khan",
  contactPhone: "+91 98765 43210",
  arrivalNotes:
    "Doors open an hour before the Nikah. Valet parking is available at the east gate; tell us if you need step-free access and we will meet you there.",
  rsvpDeadline: "01/11/2026",
  hashtag: "#MohsinWedsSimran",
  giftsNote: "Your presence and your duas are the only gifts we are hoping for.",
  livestreamUrl: "",
  additionalEvents: [
    {
      title: "Mehndi Night",
      date: "20/11/2026",
      time: "6:00 PM IST",
      venue: "The Rose Courtyard",
      address: "New Delhi",
    },
    {
      title: "Nikah",
      date: "22/11/2026",
      time: "7:30 PM IST",
      venue: "The Mughal Gardens",
      address: "New Delhi",
    },
    {
      title: "Walima Reception",
      date: "23/11/2026",
      time: "8:00 PM IST",
      venue: "The Moonlit Ballroom",
      address: "New Delhi",
    },
  ],
  songs: [{ title: "Royal Courtyard", url: "/audio/royal-courtyard.mp3" }],
  theme: "mughal-moon-film",
  framework: "cinematic-stage",
  elements: {
    gate: true,
    countdown: true,
    message: true,
    portraits: true,
    story: true,
    gallery: true,
    schedule: true,
    venueMap: true,
    dressCode: true,
    contact: true,
    rsvp: true,
    wishes: true,
    gifts: true,
    livestream: false,
  },
};

export const Route = createFileRoute("/film")({
  head: () => ({
    meta: [
      { title: "Mohsin & Simran — A Wedding Film" },
      {
        name: "description",
        content:
          "A cinematic wedding invitation: a twenty-second moonlit film, then an invitation you scroll through like a camera move. Mughal Moon — The Film by InvitingYou.",
      },
      { property: "og:title", content: "Mohsin & Simran — A Wedding Film" },
      {
        property: "og:description",
        content: "Twenty seconds under the lanterns, then the invitation itself. #MohsinWedsSimran",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FilmPremiere,
});

function FilmPremiere() {
  return (
    <PersonalInvitation
      title="Mohsin & Simran — A Wedding Film"
      content={filmCard}
      cardId="film-premiere-demo"
      slug="film-premiere"
    />
  );
}
