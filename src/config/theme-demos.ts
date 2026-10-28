import g1 from "@/assets/g1.webp";
import g2 from "@/assets/g2.webp";
import g3 from "@/assets/g3.webp";
import g4 from "@/assets/g4.webp";
import g5 from "@/assets/g5.webp";
import g6 from "@/assets/g6.webp";
import groomPortrait from "@/assets/groom.webp";
import bridePortrait from "@/assets/bride.webp";
import {
  defaultInvitationElements,
  invitationThemeCategories,
  invitationThemeIds,
  invitationThemes,
  type InvitationFramework,
  type InvitationTheme,
} from "@/components/wedding/invitation-options";

/**
 * One complete, ready-to-open demo for every theme in the collection.
 *
 * These are not swatches. Each demo is a real invitation: its own couple, city,
 * ceremony order, love note, gallery frames, dress code and a soundtrack pulled
 * from YouTube, so a customer can open the card, hear the song, scroll the whole
 * story and only then decide "that one is ours".
 */

export type DemoGalleryPhoto = {
  /** Full-size frame, used by the demo card itself. */
  src: string;
  /** 320 px still for the tiles — 22 tiles of full-size photos is a slow page. */
  thumb: string;
  caption: string;
};

export type DemoSong = {
  title: string;
  url: string;
  clipStart?: number;
  clipEnd?: number;
};

export type ThemeDemo = {
  theme: InvitationTheme;
  /** Category id from `invitationThemeCategories`, derived from the theme. */
  category: string;
  /** Short, human line used on the pick-a-theme cards. */
  mood: string;
  title: string;
  groomName: string;
  brideName: string;
  date: string;
  time: string;
  endTime: string;
  venue: string;
  address: string;
  eventType: string;
  hosts: string;
  hostName: string;
  message: string;
  story: string;
  dressCode: string;
  contactName: string;
  contactPhone: string;
  hashtag: string;
  giftsNote: string;
  arrivalNotes: string;
  rsvpDeadline: string;
  mapUrl: string;
  livestreamUrl: string;
  additionalEvents: { title: string; date: string; time: string; venue: string; address: string }[];
  songs: DemoSong[];
  portraits: { groom: string; bride: string };
  gallery: DemoGalleryPhoto[];
  framework: InvitationFramework;
};

const PHOTOS = [g1, g2, g3, g4, g5, g6];
/** Basenames of the same six photographs, for the pre-built small stills. */
const PHOTO_NAMES = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** Rotates the photo strip per demo so no two cards open with the same frame. */
function frames(offset: number, captions: string[]): DemoGalleryPhoto[] {
  return captions.map((caption, index) => {
    const photo = (offset + index) % PHOTOS.length;
    return {
      src: PHOTOS[photo],
      thumb: `/demo/photo/${PHOTO_NAMES[photo]}.webp`,
      caption,
    };
  });
}

/**
 * A 560 px still of the theme's artwork, built by `scripts/build-demo-thumbs.mjs`.
 * The collection draws twenty-two of these at once; the full-page art behind
 * them is 250–380 KB each.
 */
export function demoPoster(theme: InvitationTheme): string {
  return `/demo/poster/${theme}.webp`;
}

/** Real YouTube tracks — the demo soundtrack a guest hears on opening the card. */
const SONG = {
  kesariya: { title: "Kesariya", url: "https://youtu.be/BddP6PYo2gs", clipStart: 32, clipEnd: 76 },
  tumHiHo: { title: "Tum Hi Ho", url: "https://youtu.be/Umqb9KENgmk", clipStart: 58, clipEnd: 102 },
  raabta: { title: "Raabta", url: "https://youtu.be/zlt38OOqwDc", clipStart: 44, clipEnd: 88 },
  jashnEBahara: { title: "Jashn-e-Bahara", url: "https://youtu.be/cQxeYih6a4U" },
  dinShagnaDa: { title: "Din Shagna Da", url: "https://youtu.be/1LVpuWpRs3I" },
  dilDiyanGallan: { title: "Dil Diyan Gallan", url: "https://youtu.be/l6Nu7A27-9Q" },
  navraiMajhi: { title: "Navrai Majhi", url: "https://youtu.be/hEHNef66HT0" },
  kunFayaKun: { title: "Kun Faya Kun", url: "https://youtu.be/T94PHkuydcw" },
  radha: { title: "Radha", url: "https://youtu.be/gSAcPWuXBOY" },
  laalIshq: { title: "Laal Ishq", url: "https://youtu.be/TuJXwmHmwhQ" },
  bombayTheme: { title: "Bombay Theme", url: "https://youtu.be/SZOkXFZK4cA" },
  perfect: { title: "Perfect", url: "https://youtu.be/2Vv-BfVoq4g" },
  thousandYears: { title: "A Thousand Years", url: "https://youtu.be/rtOvBOTyX00" },
  gerua: { title: "Gerua", url: "https://youtu.be/AEIVhBS6baE" },
  rabDikhtaHai: { title: "Tujh Mein Rab Dikhta Hai (flute)", url: "https://youtu.be/uYFxTczfT8g" },
  nasheedPromise: { title: "A Promise — Benammi", url: "https://youtu.be/lMhmez58cKA" },
  nasheedNoor: { title: "Wedding Nasheed", url: "https://youtu.be/D7mg8zkmiy8" },
  nasheedSalam: {
    title: "Salam — Muhammad Al Muqit",
    url: "https://www.youtube.com/watch?v=pBa-9GJ-IXg",
  },
  nasheedAman: { title: "Aman", url: "https://youtu.be/fDZ85ETBAXY" },
} satisfies Record<string, DemoSong>;

const liveUrl = "https://www.youtube.com/@invitingyou/live";

type DemoSeed = Omit<
  ThemeDemo,
  "portraits" | "framework" | "livestreamUrl" | "endTime" | "category"
> &
  Partial<Pick<ThemeDemo, "framework" | "portraits" | "endTime" | "livestreamUrl">>;

function demo(seed: DemoSeed): ThemeDemo {
  return {
    category: invitationThemes.find((entry) => entry.id === seed.theme)?.category ?? "cinema",
    framework: "moonlit",
    portraits: { groom: groomPortrait, bride: bridePortrait },
    livestreamUrl: liveUrl,
    endTime: "",
    ...seed,
  };
}

/**
 * Twenty-two demos, one per theme. Names, cities, dates and stories all differ
 * so the collection reads like twenty-two real celebrations, not one card
 * recoloured.
 */
export const themeDemos: ThemeDemo[] = [
  demo({
    theme: "mughal-moon-film",
    mood: "A moonlit Mughal courtyard, film-first",
    title: "Ayaan & Zara — Moonlit Courtyard",
    groomName: "Ayaan",
    brideName: "Zara",
    date: "12/02/2027",
    time: "7:30 PM",
    endTime: "11:00 PM",
    venue: "Bara Imambara Courtyard",
    address: "Husainabad, Lucknow, Uttar Pradesh",
    eventType: "Nikah & Walima",
    hosts: "The Ansari and Qureshi families",
    hostName: "Farhan Ansari",
    message:
      "Some nights are written before we are born. Ours began under the same moon that lights this courtyard — and it would be incomplete without you in it.",
    story:
      "We met in a college library in Lucknow, arguing over the last copy of a Ghalib diwan. Six winters later, Ayaan still reads to Zara every Friday, and Zara still corrects his pronunciation. The moon over the Imambara has watched every chapter since.",
    dressCode: "Ivory, rose gold and midnight green",
    contactName: "Farhan Ansari (groom's brother)",
    contactPhone: "+91 98390 21476",
    hashtag: "#AyaanWedsZara",
    giftsNote:
      "Your duas are the gift we asked for. If you wish to give more, a bookshelf for our first home would be loved.",
    arrivalNotes:
      "Valet parking opens at 6:45 PM from the Rumi Darwaza side. The nikah hall is a three-minute walk, lit with lanterns.",
    rsvpDeadline: "25/01/2027",
    mapUrl: "https://maps.google.com/?q=Bara+Imambara+Lucknow",
    additionalEvents: [
      {
        title: "Mehndi & Qawwali",
        date: "10/02/2027",
        time: "4:00 PM",
        venue: "Amina's haveli",
        address: "Chowk, Lucknow",
      },
      {
        title: "Nikah",
        date: "12/02/2027",
        time: "7:30 PM",
        venue: "Bara Imambara Courtyard",
        address: "Husainabad, Lucknow",
      },
      {
        title: "Walima Dinner",
        date: "13/02/2027",
        time: "8:00 PM",
        venue: "The Grand Mughal Ballroom",
        address: "Gomti Nagar, Lucknow",
      },
    ],
    songs: [SONG.jashnEBahara, SONG.nasheedPromise],
    gallery: frames(0, [
      "The courtyard at first light",
      "Zara's mehndi night",
      "Reading Ghalib, again",
      "Lanterns for the nikah",
      "The moon we promised under",
    ]),
  }),
  demo({
    theme: "eid",
    mood: "Eid morning, chameli and gold",
    title: "Imran & Ayesha — Eid Mubarak",
    groomName: "Imran",
    brideName: "Ayesha",
    date: "19/03/2027",
    time: "11:00 AM",
    endTime: "3:30 PM",
    venue: "Charminar Banquet, Hall of Arches",
    address: "Pathergatti, Hyderabad, Telangana",
    eventType: "Nikah",
    hosts: "The Siddiqui family",
    hostName: "Sana Siddiqui",
    message:
      "On the morning of Eid, after the prayers and the sheer khurma, we will say yes to each other. Come share the sweetness of that morning with us.",
    story:
      "Every Eid for nine years, Imran brought Ayesha a box of chameli from the old city market. Last Eid he brought a ring instead — and she had been waiting since the first box.",
    dressCode: "Pastel greens, ivory and gold",
    contactName: "Sana Siddiqui (bride's sister)",
    contactPhone: "+91 90007 55120",
    hashtag: "#EidOfOurLives",
    giftsNote:
      "Please come hungry and happy. A contribution to the orphanage we volunteer at would mean the world.",
    arrivalNotes:
      "Parking is at the Salar Jung annexe. Women's prayer room and a children's corner are on the first floor.",
    rsvpDeadline: "05/03/2027",
    mapUrl: "https://maps.google.com/?q=Charminar+Hyderabad",
    additionalEvents: [
      {
        title: "Chand Raat Mehndi",
        date: "17/03/2027",
        time: "6:00 PM",
        venue: "Bride's terrace",
        address: "Tolichowki, Hyderabad",
      },
      {
        title: "Eid Namaz & Nikah",
        date: "19/03/2027",
        time: "11:00 AM",
        venue: "Charminar Banquet",
        address: "Pathergatti, Hyderabad",
      },
    ],
    songs: [SONG.nasheedSalam, SONG.kunFayaKun],
    gallery: frames(1, [
      "Chand raat on the terrace",
      "Chameli from the old city",
      "Sheer khurma, first batch",
      "The Hall of Arches",
      "Eid morning light",
    ]),
  }),
  demo({
    theme: "aladin",
    mood: "Arabian nights, one wish granted",
    title: "Rehan & Nazneen — One Thousand Nights",
    groomName: "Rehan",
    brideName: "Nazneen",
    date: "05/12/2027",
    time: "8:00 PM",
    endTime: "1:00 AM",
    venue: "Amber Fort — Diwan-e-Aam",
    address: "Amer, Jaipur, Rajasthan",
    eventType: "Nikah & Reception",
    hosts: "The Mirza family",
    hostName: "Adil Mirza",
    message:
      "They say a lamp grants three wishes. We only needed one: each other. Bring your dancing shoes — the desert night is long.",
    story:
      "Rehan proposed with a paper lamp he folded himself, in a Jaipur rooftop café with one working bulb. Nazneen said yes before he finished the sentence, then asked for the receipt.",
    dressCode: "Jewel tones with a touch of shine",
    contactName: "Adil Mirza (groom's cousin)",
    contactPhone: "+91 98290 33741",
    hashtag: "#NightsOfNazneen",
    giftsNote: "No boxes, please — bring a story to tell us at the table instead.",
    arrivalNotes:
      "Shuttles from Amer parking run every ten minutes from 7:15 PM. The courtyard is torch-lit, avoid stilettos on the stone.",
    rsvpDeadline: "18/11/2027",
    mapUrl: "https://maps.google.com/?q=Amber+Fort+Jaipur",
    additionalEvents: [
      {
        title: "Sangeet under the stars",
        date: "03/12/2027",
        time: "7:30 PM",
        venue: "Nahargarh terrace",
        address: "Amer Road, Jaipur",
      },
      {
        title: "Nikah",
        date: "05/12/2027",
        time: "8:00 PM",
        venue: "Diwan-e-Aam, Amber Fort",
        address: "Amer, Jaipur",
      },
      {
        title: "Poolside brunch",
        date: "06/12/2027",
        time: "11:00 AM",
        venue: "Rajmahal Palace",
        address: "Sardar Patel Marg, Jaipur",
      },
    ],
    songs: [SONG.raabta, SONG.nasheedAman],
    gallery: frames(2, [
      "Torches at the Diwan-e-Aam",
      "The paper lamp he made",
      "Sangeet rehearsal, midnight",
      "Nazneen's mirror work",
      "Jaipur rooftop, first evening",
    ]),
  }),
  demo({
    theme: "bihari-vibe",
    mood: "Patna shaadi — litti, dhol and full drama",
    title: "Rohit & Priyanka — Patna Se Pyaar",
    groomName: "Rohit",
    brideName: "Priyanka",
    date: "24/01/2027",
    time: "6:30 PM",
    endTime: "10:30 PM",
    venue: "Gandhi Maidan Garden Lawns",
    address: "Gandhi Maidan, Patna, Bihar",
    eventType: "Shubh Vivah",
    hosts: "The Kumar and Mishra families",
    hostName: "Deepak Kumar",
    message:
      "Dhol bajega, litti banega, aur aap zaroor aana. Ganga kinare ki shaadi hai — thoda shor, bahut pyaar.",
    story:
      "Rohit and Priyanka grew up two lanes apart in Kadam Kuan, fighting over kite strings every Makar Sankranti. Twenty years later, the same rooftops are where they will dance at their own baraat.",
    dressCode: "Marigold, red and bright yellow",
    contactName: "Deepak Kumar (groom's brother)",
    contactPhone: "+91 94310 88265",
    hashtag: "#PatnaSePyaar",
    giftsNote: "Shagun in blessings. And please, no more steel dinner sets — we have nine.",
    arrivalNotes:
      "Lawns open at 5:45 PM. Autos from Patna Junction drop at Gate 4; ask for the Kumar baraat.",
    rsvpDeadline: "10/01/2027",
    mapUrl: "https://maps.google.com/?q=Gandhi+Maidan+Patna",
    additionalEvents: [
      {
        title: "Haldi & Litti Party",
        date: "22/01/2027",
        time: "10:00 AM",
        venue: "Kadam Kuan home",
        address: "Kadam Kuan, Patna",
      },
      {
        title: "Baraat & Vivah",
        date: "24/01/2027",
        time: "6:30 PM",
        venue: "Gandhi Maidan Lawns",
        address: "Patna, Bihar",
      },
      {
        title: "Griha Pravesh Lunch",
        date: "25/01/2027",
        time: "1:00 PM",
        venue: "The new flat",
        address: "Rajendra Nagar, Patna",
      },
    ],
    songs: [SONG.navraiMajhi, SONG.gerua],
    gallery: frames(3, [
      "Marigold gate at Gandhi Maidan",
      "Haldi morning, Kadam Kuan",
      "Kite strings, Makar Sankranti",
      "Litti in progress",
      "Dhol at the baraat",
    ]),
  }),
  demo({
    theme: "mecca_madinah",
    mood: "Quiet green domes, hearts at rest",
    title: "Yusuf & Hiba — Safar-e-Noor",
    groomName: "Yusuf",
    brideName: "Hiba",
    date: "08/10/2027",
    time: "5:00 PM",
    endTime: "9:00 PM",
    venue: "Iqra Convention Centre",
    address: "Banjara Hills, Hyderabad, Telangana",
    eventType: "Nikah",
    hosts: "The Firdous family",
    hostName: "Aamir Firdous",
    message:
      "A quiet beginning, by the grace of Allah. We ask for your duas more than your presence — though we would love both.",
    story:
      "Yusuf and Hiba met while volunteering at a Ramadan iftar kitchen. He packed dates, she counted plates, and by the last night neither of them wanted the queue to end.",
    dressCode: "Modest formal — white, sage and sandalwood",
    contactName: "Aamir Firdous (groom's brother)",
    contactPhone: "+91 90004 71238",
    hashtag: "#SafarENoor",
    giftsNote: "Please give what you would have spent to the mosque kitchen where we met.",
    arrivalNotes:
      "Separate prayer spaces for men and women. Parking at Gate 2, ushers will guide you.",
    rsvpDeadline: "20/09/2027",
    mapUrl: "https://maps.google.com/?q=Banjara+Hills+Hyderabad",
    additionalEvents: [
      {
        title: "Quran Khwani",
        date: "06/10/2027",
        time: "5:30 PM",
        venue: "Family masjid",
        address: "Mehdipatnam, Hyderabad",
      },
      {
        title: "Nikah",
        date: "08/10/2027",
        time: "5:00 PM",
        venue: "Iqra Convention Centre",
        address: "Banjara Hills, Hyderabad",
      },
    ],
    songs: [SONG.nasheedNoor, SONG.nasheedPromise],
    gallery: frames(4, [
      "The convention hall, before guests",
      "Iftar kitchen volunteers",
      "Dates and roses",
      "Hiba's dupatta detail",
      "An evening of duas",
    ]),
  }),
  demo({
    theme: "luxury",
    mood: "Black-tie glamour by the lake",
    title: "Vikram & Ananya — The Gold List",
    groomName: "Vikram",
    brideName: "Ananya",
    date: "14/11/2027",
    time: "7:00 PM",
    endTime: "2:00 AM",
    venue: "Lake Palace Terrace, Udaipur",
    address: "Pichola Lake, Udaipur, Rajasthan",
    eventType: "Wedding & Reception",
    hosts: "The Rathore and Sen families",
    hostName: "Meera Rathore",
    message:
      "One night, one lake, and everyone we love in one room. Black tie, bare feet for dancing later.",
    story:
      "Vikram hired Ananya's architecture firm to restore a heritage haveli; she fired him as a client on week two. They had dinner to settle the dispute and never stopped having dinner.",
    dressCode: "Black tie — champagne, charcoal and gold",
    contactName: "Meera Rathore (bride's sister)",
    contactPhone: "+91 98280 66419",
    hashtag: "#TheGoldList",
    giftsNote:
      "Your company is the luxury. A note in our guest book is worth more than anything wrapped.",
    arrivalNotes:
      "Boats from the City Palace jetty at 6:30 PM, last one at 7:15 PM sharp. The terrace is open-air.",
    rsvpDeadline: "20/10/2027",
    mapUrl: "https://maps.google.com/?q=Lake+Palace+Udaipur",
    additionalEvents: [
      {
        title: "Cocktails at the haveli",
        date: "13/11/2027",
        time: "8:00 PM",
        venue: "Jagat Niwas Rooftop",
        address: "Lal Ghat, Udaipur",
      },
      {
        title: "Vows & Reception",
        date: "14/11/2027",
        time: "7:00 PM",
        venue: "Lake Palace Terrace",
        address: "Pichola Lake, Udaipur",
      },
    ],
    songs: [SONG.perfect, SONG.thousandYears],
    gallery: frames(5, [
      "The terrace before sunset",
      "Ananya's heirloom earrings",
      "Boats on Pichola",
      "Gold place settings",
      "Udaipur from the water",
    ]),
  }),
  demo({
    theme: "futuristic",
    mood: "Neon vows, tomorrow's love",
    title: "Kabir & Ira — 2077",
    groomName: "Kabir",
    brideName: "Ira",
    date: "21/08/2027",
    time: "9:00 PM",
    endTime: "3:00 AM",
    venue: "The Foundry, Level 14",
    address: "Whitefield, Bengaluru, Karnataka",
    eventType: "Wedding Celebration",
    hosts: "The Nair family",
    hostName: "Rhea Nair",
    message:
      "Two engineers, one algorithm, zero doubts. Come for the vows, stay for the synth set at midnight.",
    story:
      "They matched on an app that predicted 94% compatibility. Kabir wrote a script to improve it to 99.6%. Ira rewrote the script to make it 100% and moved in that same weekend.",
    dressCode: "Smart black with one neon accent",
    contactName: "Rhea Nair (bride's friend)",
    contactPhone: "+91 99001 33245",
    hashtag: "#KabirIra2077",
    giftsNote:
      "Send a song for our shared playlist instead of a gift — we will play it at the after-party.",
    arrivalNotes:
      "Lift access from the north lobby; the venue is on Level 14. Valet closes at 9:30 PM.",
    rsvpDeadline: "01/08/2027",
    mapUrl: "https://maps.google.com/?q=Whitefield+Bengaluru",
    additionalEvents: [
      {
        title: "Rooftop Pre-party",
        date: "20/08/2027",
        time: "8:00 PM",
        venue: "Skyline Deck",
        address: "Whitefield, Bengaluru",
      },
      {
        title: "Vows & Synth Set",
        date: "21/08/2027",
        time: "9:00 PM",
        venue: "The Foundry",
        address: "Whitefield, Bengaluru",
      },
    ],
    songs: [SONG.bombayTheme, SONG.perfect],
    gallery: frames(0, [
      "Level 14 before the lights",
      "Ira's neon lehenga fitting",
      "The playlist wall",
      "Bengaluru after rain",
      "Rooftop pre-party",
    ]),
  }),
  demo({
    theme: "fairytale",
    mood: "Snow, pines and a glass slipper",
    title: "Arjun & Tanya — Once Upon a Winter",
    groomName: "Arjun",
    brideName: "Tanya",
    date: "22/12/2027",
    time: "4:30 PM",
    endTime: "10:00 PM",
    venue: "The Cedar Hall, Wildflower Estate",
    address: "Mashobra, Shimla, Himachal Pradesh",
    eventType: "Wedding",
    hosts: "The Kapoor family",
    hostName: "Nikhil Kapoor",
    message:
      "Bring a wool coat, a warm heart and your dancing shoes. Fairy tales are warmer when the fire is real.",
    story:
      "They were snowed in at the same Mashobra guesthouse for three days with no electricity. By the time the road opened, they had named the fireplace and planned a December wedding.",
    dressCode: "Winter whites, rubies and cashmere",
    contactName: "Nikhil Kapoor (groom's brother)",
    contactPhone: "+91 98160 22478",
    hashtag: "#OnceUponAWinter",
    giftsNote: "A blanket, a book, or a blessing — our cottage has little room and much love.",
    arrivalNotes:
      "Shimla airport transfers at 2:00 PM; the estate road is gravel, wear warm walking shoes.",
    rsvpDeadline: "05/12/2027",
    mapUrl: "https://maps.google.com/?q=Mashobra+Shimla",
    additionalEvents: [
      {
        title: "Bonfire & Kahwa",
        date: "21/12/2027",
        time: "6:00 PM",
        venue: "Wildflower deck",
        address: "Mashobra, Shimla",
      },
      {
        title: "Wedding Ceremony",
        date: "22/12/2027",
        time: "4:30 PM",
        venue: "Cedar Hall",
        address: "Mashobra, Shimla",
      },
    ],
    songs: [SONG.thousandYears, SONG.rabDikhtaHai],
    gallery: frames(1, [
      "The cedar hall, candlelit",
      "Snow on the estate road",
      "Tanya's winter veil",
      "Kahwa by the bonfire",
      "Pines at dusk",
    ]),
  }),
  demo({
    theme: "ballroom",
    mood: "Crystal chandeliers and a live band",
    title: "Raghav & Sanya — The Ballroom Night",
    groomName: "Raghav",
    brideName: "Sanya",
    date: "06/02/2027",
    time: "8:00 PM",
    endTime: "1:30 AM",
    venue: "The Grand Ballroom, Taj Mahal Palace",
    address: "Colaba, Mumbai, Maharashtra",
    eventType: "Reception",
    hosts: "The Malhotra and Bhatt families",
    hostName: "Karan Malhotra",
    message:
      "Crystal, brass and a nine-piece band. We have waited eleven years for this first dance — please be in the front row.",
    story:
      "Raghav learned the waltz for a college fest specifically to impress Sanya. She was a judge that night and gave him a 6. He has been trying to get to a 10 ever since.",
    dressCode: "Formal floor-length — champagne, navy and black",
    contactName: "Karan Malhotra (groom's brother)",
    contactPhone: "+91 98670 45902",
    hashtag: "#TheBallroomNight",
    giftsNote: "Your presence, and a dance with us before the band finishes.",
    arrivalNotes: "Hotel valet on the north entrance. Doors close for the first dance at 8:25 PM.",
    rsvpDeadline: "18/01/2027",
    mapUrl: "https://maps.google.com/?q=Taj+Mahal+Palace+Mumbai",
    additionalEvents: [
      {
        title: "Cocktail Hour",
        date: "06/02/2027",
        time: "7:00 PM",
        venue: "Sea Lounge Terrace",
        address: "Colaba, Mumbai",
      },
      {
        title: "Reception & First Dance",
        date: "06/02/2027",
        time: "8:00 PM",
        venue: "The Grand Ballroom",
        address: "Colaba, Mumbai",
      },
    ],
    songs: [SONG.thousandYears, SONG.jashnEBahara],
    gallery: frames(2, [
      "The ballroom at 6 PM",
      "Band rehearsal",
      "Sanya's first fitting",
      "Crystal and brass",
      "The sea lounge, before guests",
    ]),
  }),
  demo({
    theme: "diya-utsav",
    mood: "A thousand diyas, one blessing",
    title: "Shivam & Aditi — Diya Utsav",
    groomName: "Shivam",
    brideName: "Aditi",
    date: "29/10/2027",
    time: "6:00 PM",
    endTime: "11:00 PM",
    venue: "Assi Ghat Riverside Lawns",
    address: "Assi Ghat, Varanasi, Uttar Pradesh",
    eventType: "Shubh Vivah",
    hosts: "The Pandey family",
    hostName: "Ankit Pandey",
    message:
      "We light a diya for every guest who has carried us here. Come sit by the river, the aarti starts at seven.",
    story:
      "Shivam and Aditi met during a Diwali clean-up of Assi Ghat, both armed with brooms and bad excuses. They have lit a diya together on that ghat every year since.",
    dressCode: "Banarasi silk — red, gold and marigold",
    contactName: "Ankit Pandey (groom's cousin)",
    contactPhone: "+91 94150 88712",
    hashtag: "#DiyaUtsav",
    giftsNote: "Bring a diya if you can — we are lighting one for every guest who joins us.",
    arrivalNotes:
      "Boats from Assi Ghat at 5:30 PM. The lawns are riverside, dress for a cool evening breeze.",
    rsvpDeadline: "12/10/2027",
    mapUrl: "https://maps.google.com/?q=Assi+Ghat+Varanasi",
    additionalEvents: [
      {
        title: "Mehndi & Kajri",
        date: "27/10/2027",
        time: "4:00 PM",
        venue: "Family courtyard",
        address: "Bhelupur, Varanasi",
      },
      {
        title: "Vivah & Aarti",
        date: "29/10/2027",
        time: "6:00 PM",
        venue: "Assi Ghat Lawns",
        address: "Assi Ghat, Varanasi",
      },
    ],
    songs: [SONG.radha, SONG.navraiMajhi],
    gallery: frames(3, [
      "Diyas at Assi Ghat",
      "Mehndi in the courtyard",
      "The pandit's first blessing",
      "Banarasi silk, red and gold",
      "River at dusk",
    ]),
  }),
  demo({
    theme: "sacred-mandap",
    mood: "Temple brass and jasmine",
    title: "Karthik & Meenakshi — Mandapam",
    groomName: "Karthik",
    brideName: "Meenakshi",
    date: "02/09/2027",
    time: "7:45 AM",
    endTime: "1:00 PM",
    venue: "Meenakshi Amman Kalyana Mandapam",
    address: "East Chitrai Street, Madurai, Tamil Nadu",
    eventType: "Thirumana",
    hosts: "The Subramanian family",
    hostName: "Lakshmi Subramanian",
    message:
      "Before the sun is high, the nadaswaram will sound and we will be married. Come early, come hungry, come blessed.",
    story:
      "Karthik and Meenakshi were neighbours in Madurai whose families shared a temple courtyard. Their grandmothers fixed the alliance over filter coffee before they had even spoken — luckily, they liked each other anyway.",
    dressCode: "Kanjeevaram silk — temple red, turmeric and gold",
    contactName: "Lakshmi Subramanian (bride's mother)",
    contactPhone: "+91 94430 55127",
    hashtag: "#MandapamVows",
    giftsNote: "Blessings only. Please give generously to the temple kitchen instead.",
    arrivalNotes:
      "Muhurtham is at 8:10 AM sharp. Breakfast of idli and pongal will be served from 6:45 AM.",
    rsvpDeadline: "15/08/2027",
    mapUrl: "https://maps.google.com/?q=Meenakshi+Amman+Madurai",
    additionalEvents: [
      {
        title: "Nalangu",
        date: "31/08/2027",
        time: "5:00 PM",
        venue: "Family home",
        address: "East Chitrai Street, Madurai",
      },
      {
        title: "Thirumana Muhurtham",
        date: "02/09/2027",
        time: "7:45 AM",
        venue: "Kalyana Mandapam",
        address: "Madurai, Tamil Nadu",
      },
      {
        title: "Reception Lunch",
        date: "02/09/2027",
        time: "12:00 PM",
        venue: "Mandapam dining hall",
        address: "Madurai, Tamil Nadu",
      },
    ],
    songs: [SONG.radha, SONG.rabDikhtaHai],
    gallery: frames(4, [
      "The mandapam in morning light",
      "Jasmine for Meenakshi's hair",
      "Nadaswaram players tuning",
      "Kolam at the entrance",
      "Brass lamps and banana leaves",
    ]),
  }),
  demo({
    theme: "riad-noor",
    mood: "Moroccan arches, lantern light",
    title: "Faisal & Leila — Riad Noor",
    groomName: "Faisal",
    brideName: "Leila",
    date: "17/04/2027",
    time: "8:30 PM",
    endTime: "1:00 AM",
    venue: "Riad Noor, the inner courtyard",
    address: "Civil Lines, Jodhpur, Rajasthan",
    eventType: "Nikah",
    hosts: "The Habib family",
    hostName: "Nadia Habib",
    message:
      "Tile, water, lanterns and you. Our courtyard holds eighty people and every one of them matters.",
    story:
      "Faisal restored the riad's blue tiles by hand; Leila came to photograph the work for a magazine and stayed for the light at 6 PM. They were married a year later in that same courtyard.",
    dressCode: "Emerald, cobalt and antique gold",
    contactName: "Nadia Habib (bride's sister)",
    contactPhone: "+91 98290 77403",
    hashtag: "#RiadNoor",
    giftsNote: "A tile from your own city would delight us — we are tiling the fountain wall.",
    arrivalNotes:
      "The riad is inside the old lanes; leave cars at the clock tower and walk five minutes.",
    rsvpDeadline: "01/04/2027",
    mapUrl: "https://maps.google.com/?q=Civil+Lines+Jodhpur",
    additionalEvents: [
      {
        title: "Henna in the courtyard",
        date: "16/04/2027",
        time: "5:00 PM",
        venue: "Riad Noor",
        address: "Civil Lines, Jodhpur",
      },
      {
        title: "Nikah Under Lanterns",
        date: "17/04/2027",
        time: "8:30 PM",
        venue: "Riad Noor courtyard",
        address: "Civil Lines, Jodhpur",
      },
    ],
    songs: [SONG.nasheedPromise, SONG.dilDiyanGallan],
    gallery: frames(5, [
      "Blue tiles at golden hour",
      "Lanterns over the fountain",
      "Leila's emerald dupatta",
      "Mint tea, first pour",
      "The courtyard at 6 PM",
    ]),
  }),
  demo({
    theme: "kashi-ghat",
    mood: "Ganga aarti, boats and bells",
    title: "Dev & Gauri — Kashi Kinara",
    groomName: "Dev",
    brideName: "Gauri",
    date: "11/03/2027",
    time: "5:30 PM",
    endTime: "10:00 PM",
    venue: "Darbhanga Ghat Terrace",
    address: "Darbhanga Ghat, Varanasi, Uttar Pradesh",
    eventType: "Shubh Vivah",
    hosts: "The Tiwari family",
    hostName: "Manoj Tiwari",
    message:
      "The river has blessed this city for three thousand years. Come stand where it meets our vows.",
    story:
      "Dev rows a boat on the Ganga; Gauri teaches Kathak on the ghat steps. For two years they only knew each other as a silhouette at dawn, until a monsoon evening put them under the same awning.",
    dressCode: "Handloom silk — indigo, clay and silver",
    contactName: "Manoj Tiwari (groom's father)",
    contactPhone: "+91 94152 30094",
    hashtag: "#KashiKinara",
    giftsNote: "No gifts, please. Feed one stray on the ghat and think of us.",
    arrivalNotes: "Boats from Darbhanga Ghat at 5:00 PM. Steps are steep, ushers will help.",
    rsvpDeadline: "22/02/2027",
    mapUrl: "https://maps.google.com/?q=Darbhanga+Ghat+Varanasi",
    additionalEvents: [
      {
        title: "Haldi & Kajri",
        date: "09/03/2027",
        time: "10:00 AM",
        venue: "Family home",
        address: "Bhadaini, Varanasi",
      },
      {
        title: "Vivah at the Ghat",
        date: "11/03/2027",
        time: "5:30 PM",
        venue: "Darbhanga Ghat Terrace",
        address: "Varanasi",
      },
    ],
    songs: [SONG.rabDikhtaHai, SONG.laalIshq],
    gallery: frames(0, [
      "Boats at Darbhanga Ghat",
      "Gauri's ghungroo practice",
      "Aarti lamps on the river",
      "Indigo handloom",
      "Dawn on the Ganga",
    ]),
  }),
  demo({
    theme: "mehndi-night",
    mood: "Neon, henna and a dhol drop",
    title: "Sahil & Riya — Mehndi Night",
    groomName: "Sahil",
    brideName: "Riya",
    date: "27/05/2027",
    time: "7:00 PM",
    endTime: "1:00 AM",
    venue: "The Terrace, Hauz Khas Village",
    address: "Hauz Khas, New Delhi",
    eventType: "Mehndi & Sangeet",
    hosts: "The Chadha family",
    hostName: "Simran Chadha",
    message:
      "Henna on the hands, dhol in the ears, and a dance floor that will not survive us. Come ready.",
    story:
      "Sahil and Riya met at a friend's sangeet, competing over the same dance circle. They have not left the same circle since — they just made it their own.",
    dressCode: "Lime, fuchsia and a lot of mirror work",
    contactName: "Simran Chadha (bride's cousin)",
    contactPhone: "+91 98110 60928",
    hashtag: "#MehndiNight",
    giftsNote: "Bring your best dance move. Nothing else required.",
    arrivalNotes:
      "Rooftop access from the west stair; lifts stop at floor four. Roads are busy after 8 PM, take the metro.",
    rsvpDeadline: "10/05/2027",
    mapUrl: "https://maps.google.com/?q=Hauz+Khas+Village+New+Delhi",
    additionalEvents: [
      {
        title: "Mehndi Sitting",
        date: "27/05/2027",
        time: "4:00 PM",
        venue: "Chadha residence",
        address: "Greater Kailash, New Delhi",
      },
      {
        title: "Sangeet Night",
        date: "27/05/2027",
        time: "7:00 PM",
        venue: "The Terrace",
        address: "Hauz Khas, New Delhi",
      },
    ],
    songs: [SONG.navraiMajhi, SONG.kesariya],
    gallery: frames(1, [
      "Henna cones and neon",
      "The rooftop before the crowd",
      "Riya's mirror-work lehenga",
      "Dhol rehearsal",
      "Dance floor, 1 AM",
    ]),
  }),
  demo({
    theme: "jharokha-dawn",
    mood: "Rajputana dawn through carved windows",
    title: "Yash & Devika — Jharokha Dawn",
    groomName: "Yash",
    brideName: "Devika",
    date: "09/01/2027",
    time: "8:00 AM",
    endTime: "1:00 PM",
    venue: "Samode Haveli, the Jharokha Terrace",
    address: "Gangapole, Jaipur, Rajasthan",
    eventType: "Shubh Vivah",
    hosts: "The Chauhan family",
    hostName: "Vikram Chauhan",
    message:
      "We are married at sunrise, when the pink city is still gold. Breakfast follows, dancing follows that.",
    story:
      "Devika is a miniature painter; Yash restores jharokha windows. They met arguing about a fourteenth-century arch and have been sketching each other ever since.",
    dressCode: "Rose pink, ivory and pomegranate",
    contactName: "Vikram Chauhan (groom's brother)",
    contactPhone: "+91 98290 55817",
    hashtag: "#JharokhaDawn",
    giftsNote:
      "A brush, a pigment, or simply your blessing — our studio wall is full of gratitude.",
    arrivalNotes:
      "Gates open at 7:15 AM. Sunrise muhurtham at 8:00 AM sharp, please be seated by 7:50.",
    rsvpDeadline: "24/12/2026",
    mapUrl: "https://maps.google.com/?q=Samode+Haveli+Jaipur",
    additionalEvents: [
      {
        title: "Mehndi at the haveli",
        date: "07/01/2027",
        time: "4:00 PM",
        venue: "Samode Haveli courtyard",
        address: "Gangapole, Jaipur",
      },
      {
        title: "Sunrise Vivah",
        date: "09/01/2027",
        time: "8:00 AM",
        venue: "Jharokha Terrace",
        address: "Jaipur",
      },
      {
        title: "Breakfast & Bhangra",
        date: "09/01/2027",
        time: "10:30 AM",
        venue: "Haveli lawns",
        address: "Jaipur",
      },
    ],
    songs: [SONG.gerua, SONG.dinShagnaDa],
    gallery: frames(2, [
      "First light on the jharokha",
      "Miniature pigments",
      "Marigold on the terrace",
      "The haveli courtyard",
      "Jaipur at sunrise",
    ]),
  }),
  demo({
    theme: "haldi-baag",
    mood: "Turmeric, marigold and a garden full of laughter",
    title: "Naman & Ishita — Haldi Baag",
    groomName: "Naman",
    brideName: "Ishita",
    date: "16/05/2027",
    time: "10:00 AM",
    endTime: "3:00 PM",
    venue: "Nehru Garden, Baag-e-Haldi",
    address: "Bailey Road, Patna, Bihar",
    eventType: "Haldi",
    hosts: "The Verma family",
    hostName: "Pooja Verma",
    message:
      "Wear something yellow you do not mind ruining. We mean it — there will be a lot of turmeric.",
    story:
      "Naman and Ishita met in a community garden, both terrible at growing marigolds and very good at complaining about it. Their first shared harvest became their haldi colours.",
    dressCode: "Anything yellow (old clothes encouraged)",
    contactName: "Pooja Verma (bride's sister)",
    contactPhone: "+91 94309 12208",
    hashtag: "#HaldiBaag",
    giftsNote: "No gifts — bring a plant for the garden instead.",
    arrivalNotes: "The garden is open-air with shade tents. Parking on Bailey Road, Gate 2.",
    rsvpDeadline: "30/04/2027",
    mapUrl: "https://maps.google.com/?q=Bailey+Road+Patna",
    additionalEvents: [
      {
        title: "Haldi Ceremony",
        date: "16/05/2027",
        time: "10:00 AM",
        venue: "Nehru Garden",
        address: "Bailey Road, Patna",
      },
      {
        title: "Marigold Lunch",
        date: "16/05/2027",
        time: "12:30 PM",
        venue: "Garden pavilion",
        address: "Patna",
      },
    ],
    songs: [SONG.kesariya, SONG.gerua],
    gallery: frames(3, [
      "Marigold strings at the gate",
      "Turmeric bowls ready",
      "Ishita's yellow dupatta",
      "Garden shade tents",
      "The first splash",
    ]),
  }),
  demo({
    theme: "vows-in-ink",
    mood: "Paper, ink and quiet handwriting",
    title: "Aditya & Nandini — In Ink",
    groomName: "Aditya",
    brideName: "Nandini",
    date: "13/06/2027",
    time: "5:00 PM",
    endTime: "9:30 PM",
    venue: "The Reading Room, Pune",
    address: "Koregaon Park, Pune, Maharashtra",
    eventType: "Wedding",
    hosts: "The Deshpande family",
    hostName: "Sneha Deshpande",
    message:
      "We are writing our vows by hand, on the paper we first wrote each other on. Come read them with us.",
    story:
      "They were pen pals through a letter-writing club during the pandemic — forty-one letters, no photographs. The first time they met, Aditya recognised Nandini by her handwriting on a café order slip.",
    dressCode: "Minimal formal — white, ink blue and brass",
    contactName: "Sneha Deshpande (bride's sister)",
    contactPhone: "+91 98220 41173",
    hashtag: "#InInkVows",
    giftsNote: "A letter to us, to be opened on our first anniversary.",
    arrivalNotes:
      "The Reading Room is on the second floor; parking on Lane 6. Ceremony is indoors and quiet.",
    rsvpDeadline: "28/05/2027",
    mapUrl: "https://maps.google.com/?q=Koregaon+Park+Pune",
    additionalEvents: [
      {
        title: "Letter Writing Table",
        date: "13/06/2027",
        time: "4:00 PM",
        venue: "The Reading Room",
        address: "Koregaon Park, Pune",
      },
      {
        title: "Vows in Ink",
        date: "13/06/2027",
        time: "5:00 PM",
        venue: "The Reading Room",
        address: "Koregaon Park, Pune",
      },
    ],
    songs: [SONG.bombayTheme, SONG.tumHiHo],
    gallery: frames(4, [
      "The reading room, laid out",
      "Forty-one letters",
      "Nandini's ink-blue sari",
      "Brass pens and paper",
      "Pune rain on the window",
    ]),
  }),
  demo({
    theme: "chand-bagh",
    mood: "A garden that invites you to play",
    title: "Arhaan & Zoya — Chand Bagh",
    groomName: "Arhaan",
    brideName: "Zoya",
    date: "23/07/2027",
    time: "6:30 PM",
    endTime: "11:00 PM",
    venue: "Chand Bagh Gardens",
    address: "Sector 16, Chandigarh",
    eventType: "Wedding Celebration",
    hosts: "The Mirza and Kapoor families",
    hostName: "Gul Mirza",
    message:
      "Our garden has a cat called Noor, a squirrel called Gul, and a seat saved for you. Tap around — it all belongs to you tonight.",
    story:
      "Zoya and Arhaan built the garden's first moonlit bench together after a community clean-up, then argued about who got to sit on it. They have shared it every Friday since.",
    dressCode: "Earthy festive — sage, terracotta and gold",
    contactName: "Gul Mirza (bride's aunt)",
    contactPhone: "+91 98150 40966",
    hashtag: "#ChandBaghNights",
    giftsNote: "Plant something for the garden, and tell us where to find it.",
    arrivalNotes:
      "Garden entrance from the east gate. Noor the cat is friendly, Gul the squirrel is not.",
    rsvpDeadline: "08/07/2027",
    mapUrl: "https://maps.google.com/?q=Sector+16+Chandigarh",
    additionalEvents: [
      {
        title: "Garden Games",
        date: "23/07/2027",
        time: "5:00 PM",
        venue: "Chand Bagh Gardens",
        address: "Sector 16, Chandigarh",
      },
      {
        title: "Dinner Under the Moon",
        date: "23/07/2027",
        time: "8:00 PM",
        venue: "Chand Bagh Gardens",
        address: "Chandigarh",
      },
    ],
    songs: [SONG.raabta, SONG.radha],
    gallery: frames(5, [
      "The moon bench, rebuilt",
      "Noor, garden resident",
      "Lantern path at dusk",
      "Sage and terracotta decor",
      "Chandigarh evening light",
    ]),
  }),
  demo({
    theme: "mela-maidan",
    mood: "A wedding fair — swings, sweets, chaos",
    title: "Tara & Ishaan — Mela Maidan",
    groomName: "Ishaan",
    brideName: "Tara",
    date: "14/02/2027",
    time: "4:00 PM",
    endTime: "11:30 PM",
    venue: "Maidan Fairgrounds, Victoria",
    address: "Victoria Memorial East Grounds, Kolkata, West Bengal",
    eventType: "Wedding Celebration",
    hosts: "The Bose and Sen families",
    hostName: "Rituparna Bose",
    message:
      "A ferris wheel, jhalmuri, a magician and a wedding. Bring the children, bring your parents, bring everyone.",
    story:
      "Ishaan and Tara met at the Kolkata Book Fair, queuing for the same jhalmuri stall. Their first date was a fair; every anniversary since has been one.",
    dressCode: "Bright festive — red, mustard and teal",
    contactName: "Rituparna Bose (bride's mother)",
    contactPhone: "+91 98300 78145",
    hashtag: "#MelaMaidan",
    giftsNote: "Bring small change for the sweets stalls — the fair runs on it.",
    arrivalNotes:
      "Fair gates at 4 PM, ferris wheel rides until 9 PM. Free entry with this invitation.",
    rsvpDeadline: "30/01/2027",
    mapUrl: "https://maps.google.com/?q=Victoria+Memorial+Kolkata",
    additionalEvents: [
      {
        title: "Fair Opens",
        date: "14/02/2027",
        time: "4:00 PM",
        venue: "Maidan Fairgrounds",
        address: "Kolkata",
      },
      {
        title: "Vows at the Ferris Wheel",
        date: "14/02/2027",
        time: "7:00 PM",
        venue: "Maidan Fairgrounds",
        address: "Kolkata",
      },
      {
        title: "Jhalmuri & Music",
        date: "14/02/2027",
        time: "8:30 PM",
        venue: "Maidan Fairgrounds",
        address: "Kolkata",
      },
    ],
    songs: [SONG.navraiMajhi, SONG.kesariya],
    gallery: frames(0, [
      "Ferris wheel at golden hour",
      "Jhalmuri stall, first date",
      "Fairy lights on the maidan",
      "Tara's teal and red",
      "Kolkata skyline at dusk",
    ]),
  }),
  demo({
    theme: "royal-rajmahal",
    mood: "Palace arches, heirloom gold",
    title: "Ranveer & Aishwarya — Rajmahal",
    groomName: "Ranveer",
    brideName: "Aishwarya",
    date: "03/12/2027",
    time: "6:00 PM",
    endTime: "12:00 AM",
    venue: "City Palace, Zenana Mahal",
    address: "Old City, Udaipur, Rajasthan",
    eventType: "Shubh Vivah",
    hosts: "The Singh Deo family",
    hostName: "Bhavna Singh Deo",
    message:
      "Four generations of our family were married in these arches. Tonight the palace is ours — and yours.",
    story:
      "Ranveer and Aishwarya were introduced at a family wedding in this very palace, seated at the children's table by mistake. They spent the whole evening planning an escape and have been partners in crime since.",
    dressCode: "Royal Indian — maroon, gold and emerald",
    contactName: "Bhavna Singh Deo (groom's mother)",
    contactPhone: "+91 98290 11047",
    hashtag: "#RajmahalVows",
    giftsNote: "Blessings, and a dance with the couple before the band stops.",
    arrivalNotes: "Palace gates at 5:15 PM. Golf carts from the north gate to the Zenana Mahal.",
    rsvpDeadline: "15/11/2027",
    mapUrl: "https://maps.google.com/?q=City+Palace+Udaipur",
    additionalEvents: [
      {
        title: "Mehndi & Shehnai",
        date: "01/12/2027",
        time: "4:00 PM",
        venue: "Zenana Mahal courtyard",
        address: "Udaipur",
      },
      {
        title: "Vivah at the Palace",
        date: "03/12/2027",
        time: "6:00 PM",
        venue: "Zenana Mahal",
        address: "Udaipur",
      },
      {
        title: "Royal Breakfast",
        date: "04/12/2027",
        time: "9:30 AM",
        venue: "Palace terrace",
        address: "Udaipur",
      },
    ],
    songs: [SONG.dinShagnaDa, SONG.jashnEBahara],
    gallery: frames(1, [
      "The Zenana Mahal at dusk",
      "Heirloom gold, polished",
      "Aishwarya's maroon lehenga",
      "Shehnai in the courtyard",
      "Palace arches and lamplight",
    ]),
  }),
  demo({
    theme: "lotus-goddess",
    mood: "Lotus pond, silk and temple bells",
    title: "Aravind & Kavya — Lotus Sanctuary",
    groomName: "Aravind",
    brideName: "Kavya",
    date: "18/09/2027",
    time: "6:30 PM",
    endTime: "11:00 PM",
    venue: "Lotus Pond Pavilion, DakshinaChitra",
    address: "Muttukadu, Chennai, Tamil Nadu",
    eventType: "Shubh Vivah",
    hosts: "The Iyer family",
    hostName: "Vidya Iyer",
    message:
      "By a pond full of lotuses, with the sound of the veena, we begin. Your blessings are the only flowers we need.",
    story:
      "Kavya paints lotuses; Aravind tunes veenas. They met at a craft residency where she painted his instrument and he played her painting — badly, then beautifully.",
    dressCode: "Pastel silk — rose, pistachio and gold",
    contactName: "Vidya Iyer (bride's sister)",
    contactPhone: "+91 98410 27893",
    hashtag: "#LotusSanctuary",
    giftsNote: "A book of poetry, or a contribution to the craft school where we met.",
    arrivalNotes:
      "Pavilion is a ten-minute walk from the parking; carts available. Pond-side is humid, dress light.",
    rsvpDeadline: "02/09/2027",
    mapUrl: "https://maps.google.com/?q=DakshinaChitra+Chennai",
    additionalEvents: [
      {
        title: "Veena & Mehndi",
        date: "17/09/2027",
        time: "5:00 PM",
        venue: "Iyer residence",
        address: "Mylapore, Chennai",
      },
      {
        title: "Vivah by the Pond",
        date: "18/09/2027",
        time: "6:30 PM",
        venue: "Lotus Pond Pavilion",
        address: "Muttukadu, Chennai",
      },
    ],
    songs: [SONG.rabDikhtaHai, SONG.radha],
    gallery: frames(2, [
      "Lotuses at the pavilion",
      "Kavya's painting in progress",
      "The veena, retuned",
      "Rose and pistachio silk",
      "Temple bells at dusk",
    ]),
  }),
  demo({
    theme: "calligraphy",
    mood: "Ink, parchment and a written promise",
    title: "Ishaan & Rukmini — The Written Word",
    groomName: "Ishaan",
    brideName: "Rukmini",
    date: "26/11/2027",
    time: "5:30 PM",
    endTime: "10:00 PM",
    venue: "The Old Library, Bhopal",
    address: "Shamla Hills, Bhopal, Madhya Pradesh",
    eventType: "Wedding",
    hosts: "The Qureshi family",
    hostName: "Imaan Qureshi",
    message:
      "Our invitation is handwritten because some things should not be typed. The ceremony will be quiet, warm and full of ink.",
    story:
      "Rukmini is a calligrapher; Ishaan a paper restorer. They met over a water-damaged 1911 manuscript and spent six months saving it — and each other's weekends.",
    dressCode: "Parchment tones — cream, sepia and bronze",
    contactName: "Imaan Qureshi (bride's brother)",
    contactPhone: "+91 94250 66138",
    hashtag: "#TheWrittenWord",
    giftsNote: "Write us a line in the guest book — we are binding it into a book.",
    arrivalNotes:
      "The Old Library is up the Shamla Hills road; shuttles from the lake parking from 4:45 PM.",
    rsvpDeadline: "10/11/2027",
    mapUrl: "https://maps.google.com/?q=Shamla+Hills+Bhopal",
    additionalEvents: [
      {
        title: "Ink & Chai",
        date: "25/11/2027",
        time: "4:00 PM",
        venue: "The Old Library",
        address: "Shamla Hills, Bhopal",
      },
      {
        title: "The Ceremony",
        date: "26/11/2027",
        time: "5:30 PM",
        venue: "The Old Library",
        address: "Shamla Hills, Bhopal",
      },
    ],
    songs: [SONG.tumHiHo, SONG.bombayTheme],
    gallery: frames(3, [
      "The library before guests",
      "Parchment and bronze ink",
      "Rukmini's nib collection",
      "Bhopal lake from the hills",
      "Handwritten place cards",
    ]),
  }),
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `12/02/2027` → `12 February 2027` for the theme tiles (the card keeps DD/MM/YYYY). */
export function demoDateLabel(demo: ThemeDemo): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(demo.date);
  if (!match) return demo.date;
  const [, day, month, year] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

/** `Patna, Bihar` — the last two parts of an Indian address, tidied. */
export function demoCityLabel(demo: ThemeDemo): string {
  const parts = demo.address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(-2).join(", ") || demo.address;
}

/** The demo for a theme, with a safe fallback so a stale link never crashes. */
export function demoForTheme(theme: string): ThemeDemo {
  return themeDemos.find((entry) => entry.theme === theme) ?? themeDemos[0];
}

/** Content object handed straight to `PersonalInvitation`. */
export function demoContent(demo: ThemeDemo) {
  return {
    groomName: demo.groomName,
    brideName: demo.brideName,
    date: demo.date,
    time: demo.time,
    endTime: demo.endTime,
    venue: demo.venue,
    address: demo.address,
    eventType: demo.eventType,
    hosts: demo.hosts,
    hostName: demo.hostName,
    message: demo.message,
    story: demo.story,
    dressCode: demo.dressCode,
    contactName: demo.contactName,
    contactPhone: demo.contactPhone,
    hashtag: demo.hashtag,
    giftsNote: demo.giftsNote,
    arrivalNotes: demo.arrivalNotes,
    rsvpDeadline: demo.rsvpDeadline,
    mapUrl: demo.mapUrl,
    livestreamUrl: demo.livestreamUrl,
    additionalEvents: demo.additionalEvents,
    songs: demo.songs,
    // The demo uses bundled artwork instead of an uploaded, base64 portrait.
    groomPhoto: null,
    bridePhoto: null,
    theme: demo.theme,
    framework: demo.framework,
    // Every demo shows every element, so a customer can judge the full card.
    elements: { ...defaultInvitationElements },
  };
}

/** Human label for a theme, reused by the demo cards. */
export function demoThemeLabel(theme: InvitationTheme): string {
  return invitationThemes.find((entry) => entry.id === theme)?.label ?? "Invitation";
}

export function demoCategoryLabel(theme: InvitationTheme): string {
  const category = invitationThemes.find((entry) => entry.id === theme)?.category;
  return invitationThemeCategories.find((entry) => entry.id === category)?.label ?? "";
}

const missing = invitationThemeIds.filter(
  (theme) => !themeDemos.some((entry) => entry.theme === theme),
);

if (missing.length > 0 && import.meta.env.DEV) {
  // A theme without a demo would send the customer to a blank card; say so loudly.
  console.warn(`[theme-demos] missing demos for: ${missing.join(", ")}`);
}
