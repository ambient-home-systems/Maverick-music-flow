import { describe, expect, it } from "vitest";

import {
  acceptEngineSnapshot,
  engineSnapshotDecision,
  engineSnapshotKey,
  engineSnapshotRevision,
  resetEngineSnapshotRevisions,
} from "../src/core/state/revisioned-snapshots.js";

describe("revisioned Engine snapshots", () => {
  it("rejects a late older response for the same runtime and identity", () => {
    const revisions = new Map();
    const current = { snapshot: { domain: "queue", epoch: "boot-a", identity: "living-room", revision: 8 } };
    const late = { snapshot: { domain: "queue", epoch: "boot-a", identity: "living-room", revision: 7 } };

    expect(acceptEngineSnapshot(revisions, "queue", current)).toBe(true);
    expect(acceptEngineSnapshot(revisions, "queue", late)).toBe(false);
    expect(engineSnapshotRevision(current)).toBe(8);
  });

  it("treats an equal revision as already applied and isolates players, queues, and identities", () => {
    const revisions = new Map();
    const queue = { snapshot: { domain: "queue", epoch: "boot-a", identity: "kitchen", revision: 4 } };
    const players = { snapshot: { domain: "players", epoch: "boot-a", identity: "music_assistant", revision: 2 } };
    const otherQueue = { snapshot: { domain: "queue", epoch: "boot-a", identity: "office", revision: 1 } };

    expect(acceptEngineSnapshot(revisions, "queue", queue)).toBe(true);
    expect(acceptEngineSnapshot(revisions, "queue", queue)).toBe(false);
    expect(engineSnapshotDecision(revisions, "queue", queue)).toBe("duplicate");
    expect(acceptEngineSnapshot(revisions, "players", players)).toBe(true);
    expect(acceptEngineSnapshot(revisions, "queue", otherQueue)).toBe(true);
  });

  it("rejects unrevisioned payloads once a revision was accepted for the same identity", () => {
    const revisions = new Map();
    const revisioned = { snapshot: { domain: "queue", epoch: "boot-a", identity: "queue-kitchen", revision: 3 } };
    const legacy = { normalized: { items: [] } };

    expect(acceptEngineSnapshot(revisions, "queue", revisioned, "media_player.kitchen")).toBe(true);
    expect(acceptEngineSnapshot(revisions, "queue", legacy, "media_player.kitchen")).toBe(false);
    expect(engineSnapshotDecision(revisions, "queue", legacy, "media_player.kitchen")).toBe("stale");
    // Same meta key but the revision field is missing or invalid.
    const missingRevision = { snapshot: { domain: "queue", epoch: "boot-a", identity: "queue-kitchen" } };
    expect(acceptEngineSnapshot(revisions, "queue", missingRevision, "media_player.office")).toBe(false);
    // Other identities have no revision history yet.
    expect(acceptEngineSnapshot(revisions, "queue", legacy, "media_player.office")).toBe(true);
  });

  it("forgets the revision history for unrevisioned payloads when the domain is reset", () => {
    const revisions = new Map();
    const revisioned = { snapshot: { domain: "players", epoch: "boot-a", identity: "music_assistant", revision: 5 } };
    expect(acceptEngineSnapshot(revisions, "players", revisioned, "music_assistant")).toBe(true);
    expect(acceptEngineSnapshot(revisions, "players", { players: [] }, "music_assistant")).toBe(false);
    resetEngineSnapshotRevisions(revisions, "players");
    expect(acceptEngineSnapshot(revisions, "players", { players: [] }, "music_assistant")).toBe(true);
  });

  it("accepts revision one after an Engine restart because the epoch changes", () => {
    const revisions = new Map();
    const beforeRestart = { snapshot: { domain: "library", epoch: "boot-a", identity: "album", revision: 19 } };
    const afterRestart = { snapshot: { domain: "library", epoch: "boot-b", identity: "album", revision: 1 } };

    expect(acceptEngineSnapshot(revisions, "library", beforeRestart)).toBe(true);
    expect(acceptEngineSnapshot(revisions, "library", afterRestart)).toBe(true);
    expect(engineSnapshotKey("library", afterRestart)).toContain("boot-b");
  });

  it("keeps compatibility with Engine responses that predate revisions", () => {
    const revisions = new Map();
    expect(acceptEngineSnapshot(revisions, "queue", { normalized: { items: [] } }, "player")).toBe(true);
    expect(acceptEngineSnapshot(revisions, "queue", { normalized: { items: [] } }, "player")).toBe(true);
    expect(revisions.size).toBe(0);
  });

  it("can clear one snapshot domain without touching the others", () => {
    const revisions = new Map([
      ["queue:boot-a:kitchen", 4],
      ["players:boot-a:music_assistant", 2],
    ]);
    resetEngineSnapshotRevisions(revisions, "queue");
    expect(revisions.has("queue:boot-a:kitchen")).toBe(false);
    expect(revisions.has("players:boot-a:music_assistant")).toBe(true);
  });
});

it("isolates cached library filters even when the Engine reports the same media identity", () => {
  const revisions = new Map();
  const response = revision => ({snapshot:{domain:"library",epoch:"boot",identity:"playlist",revision}});
  expect(acceptEngineSnapshot(revisions,"library",response(8),"playlist:recent:60:false")).toBe(true);
  expect(acceptEngineSnapshot(revisions,"library",response(4),"playlist:name:60:false")).toBe(true);
  expect(acceptEngineSnapshot(revisions,"library",response(3),"playlist:name:60:false")).toBe(false);
});
