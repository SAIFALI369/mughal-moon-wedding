// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationDetailsFields } from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import { SongUploadSession } from "@/components/wedding/invitation-song-storage";

const { upload, remove, getSession, from } = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  supabase: { auth: { getSession }, storage: { from } },
}));

const userId = "11111111-2222-4333-8444-555555555555";
let latest: InvitationForm;

function Editor({ onSongUploaded }: { onSongUploaded?: (path: string) => void }) {
  const [value, onChange] = useState(() => ({ ...emptyInvitationForm(), hostName: "Farah Khan" }));
  latest = value;
  return (
    <InvitationDetailsFields value={value} onChange={onChange} onSongUploaded={onSongUploaded} />
  );
}

beforeEach(() => {
  from.mockReturnValue({ upload, remove });
  upload.mockReset().mockResolvedValue({ data: { path: "x" }, error: null });
  remove.mockReset().mockResolvedValue({ data: [], error: null });
  getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function chooseFile(file: File) {
  fireEvent.change(document.getElementById("song-file") as HTMLInputElement, {
    target: { files: [file] },
  });
}

describe("songs section in the invitation form", () => {
  it("uploads a song into the host's folder, lists it and reports the path", async () => {
    const onSongUploaded = vi.fn();
    render(<Editor onSongUploaded={onSongUploaded} />);
    expect(
      screen.getByText(
        "No songs yet. The Songs button appears on your invitation once you add one.",
      ),
    ).toBeInTheDocument();
    chooseFile(new File(["audio"], "Rose_water.mp3", { type: "audio/mpeg" }));

    expect(await screen.findByLabelText("Song 1 title")).toHaveValue("Rose water");
    expect(upload).toHaveBeenCalledTimes(1);
    const [path, , options] = upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${userId}/[0-9a-f-]{36}\\.mp3$`));
    expect(options).toMatchObject({ contentType: "audio/mpeg", upsert: false });
    expect(onSongUploaded).toHaveBeenCalledWith(path);
    expect(latest.songs[0]).toMatchObject({ title: "Rose water", path });
  });

  it("rejects an unsupported file before any upload", async () => {
    render(<Editor />);
    chooseFile(new File(["x"], "malware.exe", { type: "application/x-msdownload" }));
    expect(await screen.findByText(/Choose an MP3, M4A, WAV or OGG/)).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it("lets the host rename and remove songs, and stops at five", async () => {
    render(<Editor />);
    for (let i = 0; i < 5; i += 1) {
      chooseFile(new File(["audio"], `Song ${i}.ogg`, { type: "audio/ogg" }));
      await waitFor(() => expect(latest.songs).toHaveLength(i + 1));
    }
    expect(screen.getByText(/You have added 5 songs/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Song 1 title"), { target: { value: "Opening" } });
    expect(latest.songs[0].title).toBe("Opening");
    fireEvent.click(screen.getAllByRole("button", { name: /Remove song/ })[0]);
    expect(latest.songs).toHaveLength(4);
    expect(screen.queryByText(/You have added 5 songs/)).not.toBeInTheDocument();
  });
});

const songA = `${userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp3`;
const songB = `${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.m4a`;
const songKept = `${userId}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.wav`;
const songOld = `${userId}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.ogg`;
const songUnsaved = `${userId}/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.mp3`;

describe("SongUploadSession", () => {
  it("removes songs uploaded in a cancelled edit, and leaves saved songs alone", async () => {
    const session = new SongUploadSession();
    session.track(songA);
    session.track(songB);
    await session.discard();
    expect(remove).toHaveBeenCalledWith([songA, songB]);
    remove.mockClear();
    await session.discard();
    expect(remove).not.toHaveBeenCalled();
  });

  it("after a save, deletes replaced songs and uploads that were not kept", async () => {
    const session = new SongUploadSession();
    session.track(songKept);
    session.track(songUnsaved);
    await session.settle([songKept], [songKept, songOld]);
    expect(remove).toHaveBeenCalledWith(expect.arrayContaining([songOld, songUnsaved]));
    expect(remove.mock.calls[0][0]).not.toContain(songKept);
  });

  it("never sends a path that is not a song path to storage", async () => {
    const session = new SongUploadSession();
    await session.settle([], ["https://example.com/a.mp3", "../escape.mp3", `${userId}/a.mp3`]);
    expect(remove).not.toHaveBeenCalled();
  });
});
