export function engineSnapshotMeta(payload = null) {
  const candidates = [
    payload?.snapshot,
    payload?.normalized?.snapshot,
    payload?.data?.snapshot,
    payload?.data?.normalized?.snapshot,
  ];
  return candidates.find((candidate) => candidate && typeof candidate === "object") || null;
}

export function engineSnapshotRevision(payload = null) {
  const revision = Number(engineSnapshotMeta(payload)?.revision);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : 0;
}

export function engineSnapshotKey(domain = "", payload = null, fallbackIdentity = "") {
  const meta = engineSnapshotMeta(payload);
  const cleanDomain = String(meta?.domain || domain || "state").trim().toLowerCase();
  const epoch = String(meta?.epoch || "legacy").trim().toLowerCase();
  // Library responses share a media-type identity across distinct filters in older Engines.
  const identity = String((cleanDomain === "library" && fallbackIdentity) || meta?.identity || fallbackIdentity || "default").trim().toLowerCase();
  return `${cleanDomain}:${epoch}:${identity}`;
}

// Unrevisioned payloads carry no epoch or Engine identity, so remember per
// domain and caller identity that revisions have been seen at all.
function revisionedHistoryKey(domain = "", payload = null, fallbackIdentity = "") {
  const cleanDomain = String(engineSnapshotMeta(payload)?.domain || domain || "state").trim().toLowerCase();
  return `${cleanDomain}:*:${String(fallbackIdentity || "default").trim().toLowerCase()}`;
}

// "accept" for a newer snapshot, "duplicate" for the revision already applied,
// "stale" for an older revision or an unrevisioned payload once revisions exist.
export function engineSnapshotDecision(revisions, domain, payload, fallbackIdentity = "") {
  if (!(revisions instanceof Map)) return "accept";
  const key = engineSnapshotKey(domain, payload, fallbackIdentity);
  const historyKey = revisionedHistoryKey(domain, payload, fallbackIdentity);
  const revision = engineSnapshotRevision(payload);
  if (!revision) return revisions.has(key) || revisions.has(historyKey) ? "stale" : "accept";
  const acceptedRevision = Number(revisions.get(key) || 0);
  if (acceptedRevision > revision) return "stale";
  if (acceptedRevision === revision) return "duplicate";
  revisions.set(key, revision);
  revisions.set(historyKey, revision);
  return "accept";
}

export function acceptEngineSnapshot(revisions, domain, payload, fallbackIdentity = "") {
  return engineSnapshotDecision(revisions, domain, payload, fallbackIdentity) === "accept";
}

export function resetEngineSnapshotRevisions(revisions, domain = "") {
  if (!(revisions instanceof Map)) return;
  const prefix = String(domain || "").trim().toLowerCase();
  if (!prefix) {
    revisions.clear();
    return;
  }
  for (const key of revisions.keys()) {
    if (String(key).startsWith(`${prefix}:`)) revisions.delete(key);
  }
}
