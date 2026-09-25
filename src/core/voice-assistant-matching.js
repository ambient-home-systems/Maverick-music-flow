export const VOICE_ASSISTANT_MUSIC_STOP_WORDS = Object.freeze([
  "a",
  "an",
  "and",
  "by",
  "for",
  "from",
  "hey",
  "home",
  "listen",
  "music",
  "of",
  "on",
  "play",
  "please",
  "put",
  "song",
  "songs",
  "start",
  "the",
  "to",
  "track",
  "tracks",
]);

const VOICE_ASSISTANT_MUSIC_COMMAND_TERMS = Object.freeze([
  "please",
  "home assistant",
  "hey home assistant",
  "play",
  "put on",
  "listen to",
  "start",
  "music",
]);

export function normalizeVoiceCommandText(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,!?;:"'`()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function voiceCommandHasAny(normalizedText = "", terms = []) {
  const text = normalizeVoiceCommandText(normalizedText);
  if (!text) return false;
  const haystack = ` ${text} `;
  return terms.some((term) => {
    const needle = normalizeVoiceCommandText(term);
    if (!needle) return false;
    return haystack.includes(` ${needle} `) || text === needle;
  });
}

export function voiceAssistantAliasIndex(normalizedText = "", alias = "") {
  const text = normalizeVoiceCommandText(normalizedText);
  const needle = normalizeVoiceCommandText(alias);
  if (!text || !needle) return -1;
  const index = ` ${text} `.indexOf(` ${needle} `);
  return index >= 0 ? Math.max(0, index) : -1;
}

export function stripVoiceAssistantPlayerAliases(text = "", aliases = []) {
  let next = ` ${normalizeVoiceCommandText(text)} `;
  (Array.isArray(aliases) ? aliases : []).forEach((alias) => {
    const normalizedAlias = normalizeVoiceCommandText(alias);
    if (normalizedAlias) next = next.split(` ${normalizedAlias} `).join(" ");
  });
  return next.replace(/\s+/g, " ").trim();
}

export function extractVoiceAssistantMusicQuery(transcript = "", aliases = []) {
  let query = stripVoiceAssistantPlayerAliases(transcript, aliases);
  VOICE_ASSISTANT_MUSIC_COMMAND_TERMS.forEach((term) => {
    const normalized = normalizeVoiceCommandText(term);
    if (!normalized) return;
    query = ` ${query} `.split(` ${normalized} `).join(" ").replace(/\s+/g, " ").trim();
  });
  return query || normalizeVoiceCommandText(transcript);
}

export function voiceAssistantVolumeIntent(normalizedText = "") {
  const normalized = normalizeVoiceCommandText(normalizedText);
  if (voiceCommandHasAny(normalized, ["unmute", "sound on"])) return { type: "unmute" };
  if (voiceCommandHasAny(normalized, ["mute", "silence"])) return { type: "mute" };
  const hasVolumeWord = voiceCommandHasAny(normalized, ["volume", "sound"]);
  if (!hasVolumeWord) return null;
  if (voiceCommandHasAny(normalized, ["half"])) return { type: "volume_set", level: 0.5 };
  if (voiceCommandHasAny(normalized, ["max", "maximum"])) return { type: "volume_set", level: 1 };
  const numberMatch = normalized.match(/(\d{1,3})/);
  if (numberMatch) {
    const pct = Math.max(0, Math.min(100, Number(numberMatch[1]) || 0));
    return { type: "volume_set", level: pct / 100 };
  }
  if (voiceCommandHasAny(normalized, ["up", "higher", "louder", "increase"])) {
    return { type: "volume_delta", delta: 0.1 };
  }
  if (voiceCommandHasAny(normalized, ["down", "lower", "quieter", "decrease"])) {
    return { type: "volume_delta", delta: -0.1 };
  }
  return null;
}

export function voiceAssistantRequestedMediaType(query = "") {
  const normalized = normalizeVoiceCommandText(query);
  if (voiceCommandHasAny(normalized, ["playlist", "play list"])) return { type: "playlist", explicit: true };
  if (voiceCommandHasAny(normalized, ["album"])) return { type: "album", explicit: true };
  if (voiceCommandHasAny(normalized, ["artist", "singer"])) return { type: "artist", explicit: true };
  if (voiceCommandHasAny(normalized, ["radio", "station"])) return { type: "radio", explicit: true };
  if (voiceCommandHasAny(normalized, ["song", "track", "by"])) return { type: "track", explicit: true };
  return { type: "track", explicit: false };
}

export function voiceAssistantCanonicalMediaType(value = "", fallback = "track") {
  const type = String(value || fallback || "track").toLowerCase().trim();
  if (type === "tracks") return "track";
  if (type === "playlists" || type === "play_list" || type === "play lists") return "playlist";
  if (type === "albums") return "album";
  if (type === "artists") return "artist";
  if (type === "radios" || type === "station" || type === "stations") return "radio";
  if (type === "podcasts") return "podcast";
  if (type === "songs") return "track";
  return type || String(fallback || "track").toLowerCase().trim() || "track";
}

export function voiceAssistantImportantMusicTokens(value = "") {
  return normalizeVoiceCommandText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !VOICE_ASSISTANT_MUSIC_STOP_WORDS.includes(token));
}

export function voiceAssistantCleanMusicPhrase(value = "", { allowStopWordFallback = false } = {}) {
  const normalized = normalizeVoiceCommandText(value);
  if (!normalized) return "";
  const tokens = voiceAssistantImportantMusicTokens(normalized);
  return tokens.join(" ") || (allowStopWordFallback ? normalized : "");
}

export function voiceAssistantLatinPhoneticKeys(value = "") {
  const raw = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!raw) return [];
  const variants = new Set([
    raw,
    raw.replace(/ch/g, "sh"),
    raw.replace(/ch/g, "k"),
    raw.replace(/ph/g, "f"),
  ]);
  const keys = new Set();
  variants.forEach((variant) => {
    const normalized = variant
      .replace(/c(?=[eiy])/g, "s")
      .replace(/c/g, "k")
      .replace(/q/g, "k")
      .replace(/x/g, "ks")
      .replace(/(.)\1+/g, "$1");
    const consonants = normalized.replace(/[aeiouy]/g, "");
    [normalized, consonants].forEach((key) => {
      if (key.length >= 2) keys.add(key);
    });
  });
  return Array.from(keys);
}

export function voiceAssistantTextHasToken(normalizedText = "", token = "") {
  const haystack = normalizeVoiceCommandText(normalizedText);
  const needle = normalizeVoiceCommandText(token);
  if (!haystack || !needle) return false;
  if (` ${haystack} `.includes(` ${needle} `) || haystack.includes(needle)) return true;
  const needleKeys = voiceAssistantLatinPhoneticKeys(needle);
  if (!needleKeys.length) return false;
  return haystack
    .split(/\s+/)
    .some((word) => {
      const wordKeys = voiceAssistantLatinPhoneticKeys(word);
      return wordKeys.some((wordKey) => needleKeys.some((needleKey) =>
        wordKey === needleKey
        || (needleKey.length >= 4 && wordKey.includes(needleKey))
        || (wordKey.length >= 4 && needleKey.includes(wordKey))
      ));
    });
}

export function voiceAssistantMatchedTokenCount(tokens = [], normalizedText = "") {
  const haystack = normalizeVoiceCommandText(normalizedText);
  return (Array.isArray(tokens) ? tokens : [])
    .filter((token) => voiceAssistantTextHasToken(haystack, token))
    .length;
}

export function voiceAssistantMusicQueryParts(query = "") {
  const normalized = normalizeVoiceCommandText(query);
  if (!normalized) return { query: "", title: "", artist: "" };
  const separators = [" by ", " from "];
  for (const separator of separators) {
    const padded = ` ${normalized} `;
    const index = padded.indexOf(separator);
    if (index < 0) continue;
    const title = voiceAssistantCleanMusicPhrase(padded.slice(1, index));
    const artist = voiceAssistantCleanMusicPhrase(padded.slice(index + separator.length, -1));
    if (title && artist) return { query: normalized, title, artist };
  }
  const cleaned = voiceAssistantCleanMusicPhrase(normalized, { allowStopWordFallback: true });
  return { query: cleaned || normalized, title: cleaned || normalized, artist: "" };
}

export function voiceAssistantFocusedMusicQuery(query = "") {
  const parts = voiceAssistantMusicQueryParts(query);
  return [parts.title, parts.artist].filter(Boolean).join(" ").trim() || parts.query;
}

export function voiceAssistantCandidateScore(candidate = {}, query = "", request = voiceAssistantRequestedMediaType(query)) {
  const type = voiceAssistantCanonicalMediaType(candidate?.media_type || "", "");
  const title = normalizeVoiceCommandText(candidate?.name || candidate?.title || "");
  const artist = normalizeVoiceCommandText(candidate?.artist || "");
  const album = normalizeVoiceCommandText(candidate?.album || "");
  const parts = voiceAssistantMusicQueryParts(query);
  const q = parts.query;
  const titleNeedle = parts.title;
  const artistNeedle = parts.artist;
  const haystack = [title, artist, album].filter(Boolean).join(" ");
  let score = 0;
  if (type === request.type) score += request.explicit ? 24 : 10;
  else if (!request.explicit && type === "track") score += 10;
  else if (!request.explicit && type === "album") score += 3;
  else if (!request.explicit && type === "artist") score += 2;
  else if (!request.explicit && type === "playlist") score -= 8;
  else if (request.explicit) score -= 8;
  if (candidate?._maverickVoiceFocused === true) score += 8;
  if (q && title === q) score += 28;
  else if (q && title.startsWith(q)) score += 16;
  else if (q && title.includes(q)) score += 10;
  if (titleNeedle && title === titleNeedle) score += 34;
  else if (titleNeedle && title.startsWith(titleNeedle)) score += 22;
  else if (titleNeedle && title.includes(titleNeedle)) score += 15;
  if (artistNeedle) {
    if (artist === artistNeedle) score += 30;
    else if (artist.includes(artistNeedle) || artistNeedle.includes(artist)) score += 18;
    else if (artistNeedle.split(" ").filter(Boolean).every((word) => haystack.includes(word))) score += 12;
  }
  const words = voiceAssistantImportantMusicTokens([parts.title, parts.artist].filter(Boolean).join(" ") || q);
  const matchedWords = voiceAssistantMatchedTokenCount(words, haystack);
  score += matchedWords * 6;
  if (words.length && matchedWords === words.length) score += 12;
  if (words.length && !matchedWords) score -= 30;
  if (!request.explicit && type === "playlist" && (title.includes("hits") || title.includes("top") || title.includes("radio"))) score -= 4;
  return score;
}

export function voiceAssistantCandidateMatch(candidate = {}, query = "", request = voiceAssistantRequestedMediaType(query), index = 0) {
  const type = voiceAssistantCanonicalMediaType(candidate?.media_type || "", "");
  const title = normalizeVoiceCommandText(candidate?.name || candidate?.title || "");
  const artist = normalizeVoiceCommandText(candidate?.artist || "");
  const album = normalizeVoiceCommandText(candidate?.album || "");
  const parts = voiceAssistantMusicQueryParts(query);
  const queryTokens = voiceAssistantImportantMusicTokens([parts.title, parts.artist].filter(Boolean).join(" ") || parts.query);
  const titleTokens = voiceAssistantImportantMusicTokens(parts.title);
  const artistTokens = voiceAssistantImportantMusicTokens(parts.artist);
  const haystack = [title, artist, album].filter(Boolean).join(" ");
  const matchedTokens = voiceAssistantMatchedTokenCount(queryTokens, haystack);
  const matchedTitleTokens = voiceAssistantMatchedTokenCount(titleTokens, title);
  const matchedArtistTokens = voiceAssistantMatchedTokenCount(artistTokens, [artist, album, haystack].filter(Boolean).join(" "));
  const exactTitlePhrase = !!parts.title && (title === parts.title || title.startsWith(parts.title) || title.includes(parts.title));
  const exactQueryPhrase = !!parts.query && (title === parts.query || title.startsWith(parts.query) || title.includes(parts.query));
  const titleMatchStrong = exactTitlePhrase
    || exactQueryPhrase
    || (titleTokens.length > 0 && matchedTitleTokens === titleTokens.length);
  const hasCandidateArtist = !!artist;
  const requiredArtistMatches = artistTokens.length
    ? Math.min(artistTokens.length, Math.max(1, Math.ceil(artistTokens.length * 0.6)))
    : 0;
  const artistMatchStrong = artistTokens.length > 0 && matchedArtistTokens >= requiredArtistMatches;
  const score = voiceAssistantCandidateScore(candidate, query, request);
  let accepted = false;
  if (artistTokens.length && !titleTokens.length) {
    accepted = artistMatchStrong;
  } else if (artistTokens.length && titleTokens.length) {
    accepted = titleMatchStrong && (artistMatchStrong || !hasCandidateArtist);
  } else if (queryTokens.length === 1) {
    accepted = matchedTokens === 1 && (exactTitlePhrase || exactQueryPhrase || matchedTitleTokens === 1 || matchedArtistTokens === 1);
  } else if (queryTokens.length > 1) {
    const requiredMatches = Math.min(queryTokens.length, Math.max(2, Math.ceil(queryTokens.length * 0.55)));
    accepted = titleMatchStrong || matchedTokens >= requiredMatches;
  }
  if (request.explicit && type !== request.type) accepted = false;
  return {
    candidate,
    index,
    score,
    accepted,
    matchedTokens,
    queryTokenCount: queryTokens.length,
    exactTitlePhrase,
    exactQueryPhrase,
  };
}

export function voiceAssistantRankedCandidates(candidates = [], query = "") {
  const items = Array.isArray(candidates) ? candidates : [];
  if (!items.length) return [];
  const request = voiceAssistantRequestedMediaType(query);
  return items
    .map((candidate, index) => voiceAssistantCandidateMatch(candidate, query, request, index))
    .sort((left, right) =>
      Number(right.accepted) - Number(left.accepted)
      || right.score - left.score
      || right.matchedTokens - left.matchedTokens
      || left.index - right.index
    );
}

export function voiceAssistantBestCandidate(candidates = [], query = "") {
  return voiceAssistantRankedCandidates(candidates, query)
    .find((match) => match.accepted && match.candidate?.uri)
    ?.candidate || null;
}
