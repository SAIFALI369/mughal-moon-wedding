// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getInvitationAssistantName,
  getInvitationDetails,
  getInvitationMonogram,
} from "@/components/wedding/invitation-details";
import {
  INVITATION_SONG_LIMIT,
  isSafeSongUrl,
  sanitizeInvitationSongs,
} from "@/components/wedding/invitation-music";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { getInstantPersonalReply } from "@/components/wedding/personal-concierge-copy";
import { buildCardConciergeInstruction } from "../../supabase/functions/_shared/concierge-personality";

const basics = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
  eventType: "Nikah ceremony",
  hosts: "Together with our families",
  hostName: "Ayesha",
  message: "Join us for this joyful day",
  story: "We met at sunrise",
  theme: "eid",
  framework: "moonlit",
};

const songs = [
  { title: "Moonlit Dua", url: "/audio/moonlit-dua.mp3" },
  { title: "Our First Dance", url: "https://cdn.example.com/first-dance.mp3" },
];

describe("host-named card assistant", () => {
  it("uses the host's name, then the contact, then the hosting line, and never the homepage name", () => {
    expect(getInvitationAssistantName(getInvitationDetails(basics))).toBe("Ayesha");
    expect(
      getInvitationAssistantName(
        getInvitationDetails({ ...basics, hostName: "", contactName: "Imran Khan" }),
      ),
    ).toBe("Imran Khan");
    expect(
      getInvitationAssistantName(
        getInvitationDetails({
          ...basics,
          hostName: "",
          contactName: "",
          hosts: "The Khan Family",
        }),
      ),
    ).toBe("Khan Family");
    expect(
      getInvitationAssistantName(
        getInvitationDetails({
          ...basics,
          hostName: "",
          contactName: "",
          hosts: "Together with our families",
          groomName: "Ayaan",
        }),
      ),
    ).toBe("Ayaan");
    expect(getInvitationMonogram(getInvitationDetails(basics))).toEqual({
      left: "A",
      right: "Z",
    });
  });

  it("accepts safe song links and rejects script, data and oversized lists", () => {
    expect(isSafeSongUrl("/audio/moonlit-dua.mp3")).toBe(true);
    expect(isSafeSongUrl("https://cdn.example.com/a.mp3")).toBe(true);
    expect(isSafeSongUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeSongUrl("data:audio/mp3;base64,AAAA")).toBe(false);
    expect(isSafeSongUrl("http://insecure.example.com/a.mp3")).toBe(false);
    expect(isSafeSongUrl("//evil.example.com/a.mp3")).toBe(false);

    const cleaned = sanitizeInvitationSongs([
      ...songs,
      { title: "Bad", url: "javascript:alert(1)" },
    ]);
    expect(cleaned).toHaveLength(2);

    const parsed = invitationContentSchema.safeParse({ ...basics, songs });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.songs).toEqual(songs);
      expect(parsed.data.hostName).toBe("Ayesha");
    }
    expect(
      invitationContentSchema.safeParse({
        ...basics,
        songs: Array.from({ length: INVITATION_SONG_LIMIT + 1 }, () => songs[0]),
      }).success,
    ).toBe(false);
    expect(
      invitationContentSchema.safeParse({
        ...basics,
        songs: [{ title: "Script", url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });

  it("introduces this card's host and playlist, never the main couple's facts", () => {
    const details = getInvitationDetails({ ...basics, songs });
    const instruction = buildCardConciergeInstruction(
      {
        assistantName: getInvitationAssistantName(details),
        hostName: details.hostName,
        hostLine: details.hosts,
        couple: `${details.groomName} & ${details.brideName}`,
        eventType: details.eventType,
        date: details.date,
        time: details.time,
        venue: details.venue,
        address: details.address,
        message: details.message,
        story: details.story,
        dressCode: details.dressCode,
        contactName: details.contactName,
        contactPhone: details.contactPhone,
        arrivalNotes: details.arrivalNotes,
        rsvpDeadline: details.rsvpDeadline,
        extraEvents: details.additionalEvents,
        songs: details.songs.map((song) => ({ title: song.title })),
      },
      "English",
    );
    expect(instruction).toContain("Ayesha");
    expect(instruction).toContain("Garden Pavilion");
    expect(instruction).toContain("Our First Dance");
    expect(instruction).not.toContain("Mohsin");
    expect(instruction).not.toContain("Simran");
  });

  it("answers card questions instantly from this card's details", () => {
    const details = getInvitationDetails({ ...basics, songs });
    expect(getInstantPersonalReply("Where is the venue?", details, "English")).toContain(
      "Garden Pavilion",
    );
    expect(getInstantPersonalReply("When is the celebration?", details, "English")).toContain(
      "15 December 2030",
    );
    const playlist = getInstantPersonalReply("What songs are on the playlist?", details, "English");
    expect(playlist).toContain("Moonlit Dua");
    expect(playlist).toContain("Our First Dance");
  });

  it("shows the host's assistant and soundtrack in the card preview, still without Simran", () => {
    const markup = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={{ ...basics, songs }}
        preview
        showGate={false}
      />,
    );
    expect(markup).toContain("Ayesha");
    expect(markup).toContain("AI host assistant");
    expect(markup).toContain("Moonlit Dua");
    expect(markup).toContain("Our First Dance");
    expect(markup).toContain('id="assistant"');
    expect(markup).not.toContain("Simran");
    expect(markup).not.toContain("Mohsin");
  });
});
