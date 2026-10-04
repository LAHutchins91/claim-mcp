export type ClaimStatus = "APPROVED" | "RETIRED";

export type ApprovedClaim = {
  statement: string;
  status: ClaimStatus | string;
};

export type BrandOffer = {
  name: string;
  terms: string;
  active: boolean;
};

export type BannedPhrase = {
  phrase: string;
};

export type ViolationKind =
  | "banned_phrase"
  | "invented_guarantee"
  | "invented_discount"
  | "unapproved_offer";

export type Violation = {
  kind: ViolationKind;
  detail: string;
  excerpt: string;
};

export type CheckResult = {
  verdict: "approved" | "rejected";
  violations: Violation[];
};

const GUARANTEE_MARKERS = [
  "guarantee",
  "guarantees",
  "guaranteed",
  "warranty",
  "warranties",
  "money-back",
  "money back",
  "risk-free",
  "risk free",
  "no-risk",
  "no risk",
  "lifetime warranty",
  "lifetime guarantee",
  "lifetime access",
  "lifetime support",
  "for a lifetime",
  "lasts a lifetime"
] as const;

const SPECIFIC_PHRASES: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bhalf[-\s]?off\b/i, value: "half-off" },
  { pattern: /\bbogo\b/i, value: "bogo" },
  { pattern: /\bbuy one,? get one\b/i, value: "bogo" },
  { pattern: /\bcomplimentary\b/i, value: "complimentary" },
  { pattern: /\bgratis\b/i, value: "complimentary" },
  { pattern: /\bfree\b/i, value: "complimentary" }
];

const GENERIC_REDUCTION = /\b(?:discounts?|coupons?|promotions?|promotional|promo|on sale|sale price)\b/i;
const DISCOUNT_CONTEXT = /\b(?:off|discounts?|save|saving|coupon|promo|sale)\b/i;

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function soften(value: string) {
  return normalize(value).replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();
}

function sentences(text: string) {
  const parts = text.split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()].filter(Boolean);
}

function numbersIn(text: string) {
  const found = new Set<string>();
  for (const match of text.matchAll(/\d+(?:\.\d+)?/g)) {
    const value = Number(match[0]);
    if (Number.isFinite(value)) found.add(String(value));
  }
  return found;
}

function amountsIn(text: string) {
  const found = new Set<string>();
  const patterns = [
    /[$€£]\s*(\d+(?:\.\d+)?)/g,
    /\b(\d+(?:\.\d+)?)\s*(?:usd|eur|gbp|dollars|euros|pounds)\b/gi
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) found.add(String(value));
    }
  }
  return found;
}

function discountPercents(text: string) {
  const found = new Set<string>();
  for (const sentence of sentences(text)) {
    if (!DISCOUNT_CONTEXT.test(sentence)) continue;
    for (const match of sentence.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi)) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) found.add(String(value));
    }
  }
  return found;
}

function phrasePattern(phrase: string) {
  const trimmed = phrase.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const start = /^\w/u.test(trimmed) ? "\\b" : "";
  const end = /\w$/u.test(trimmed) ? "\\b" : "";
  return new RegExp(`${start}${escaped}${end}`, "i");
}

function containsPhrase(haystack: string, needle: string) {
  const left = ` ${soften(haystack)} `;
  const right = ` ${soften(needle)} `;
  return right.trim().length > 0 && left.includes(right);
}

function markersIn(text: string) {
  const hay = normalize(text);
  return GUARANTEE_MARKERS.filter((marker) => phrasePattern(marker).test(hay));
}

function specificPhrases(text: string) {
  const found = new Set<string>();
  for (const entry of SPECIFIC_PHRASES) {
    if (entry.pattern.test(text)) found.add(entry.value);
  }
  return found;
}

function hasGenericReduction(text: string) {
  return GENERIC_REDUCTION.test(text);
}

function hasAnyReduction(text: string) {
  return hasGenericReduction(text) || specificPhrases(text).size > 0 || discountPercents(text).size > 0 || amountsIn(text).size > 0;
}

function codesIn(text: string) {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b(?:code|promo)\s+([A-Za-z0-9][A-Za-z0-9-]{2,19})\b/gi)) {
    found.add(match[1].toLocaleLowerCase());
  }
  return found;
}

function excerpt(text: string, limit = 240) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1)}…`;
}

function coversGuarantee(sentence: string, claim: string) {
  const sentenceMarkers = markersIn(sentence);
  if (sentenceMarkers.length === 0) return false;
  const claimMarkers = new Set(markersIn(claim));
  if (!sentenceMarkers.every((marker) => claimMarkers.has(marker))) return false;
  if (!containsPhrase(sentence, claim) && !containsPhrase(claim, sentence)) return false;
  const claimNumbers = numbersIn(claim);
  for (const value of numbersIn(sentence)) {
    if (!claimNumbers.has(value)) return false;
  }
  return true;
}

function offerParts(offer: BrandOffer) {
  return [offer.name, offer.terms, `${offer.name} ${offer.terms}`].map(normalize).filter((part) => part.length >= 4);
}

function coversOfferSentence(sentence: string, offer: BrandOffer) {
  return offerParts(offer).some((part) => containsPhrase(sentence, part) || containsPhrase(part, sentence));
}

export function checkBrandCopy(input: {
  draft: string;
  claims: ApprovedClaim[];
  offers: BrandOffer[];
  bannedPhrases: BannedPhrase[];
}): CheckResult {
  const draft = input.draft ?? "";
  const violations: Violation[] = [];
  const push = (violation: Violation) => {
    if (violations.some((existing) => existing.kind === violation.kind && existing.excerpt === violation.excerpt && existing.detail === violation.detail)) return;
    violations.push(violation);
  };
  const approvedClaims = input.claims.filter((claim) => claim.status === "APPROVED" && claim.statement.trim());
  const activeOffers = input.offers.filter((offer) => offer.active && (offer.name.trim() || offer.terms.trim()));
  const inactiveOffers = input.offers.filter((offer) => !offer.active && offer.name.trim());
  const offerBlob = activeOffers.map((offer) => `${offer.name}\n${offer.terms}`).join("\n");

  for (const banned of input.bannedPhrases) {
    const phrase = banned.phrase.trim();
    if (phrase.length < 2) continue;
    if (phrasePattern(phrase).test(draft)) {
      push({
        kind: "banned_phrase",
        detail: "Draft contains a phrase this brand has banned.",
        excerpt: excerpt(phrase)
      });
    }
  }

  for (const sentence of sentences(draft)) {
    if (markersIn(sentence).length === 0) continue;
    const covered = approvedClaims.some((claim) => coversGuarantee(sentence, claim.statement));
    if (!covered) {
      push({
        kind: "invented_guarantee",
        detail: "This sentence states a guarantee that no approved claim covers. Retired claims do not count.",
        excerpt: excerpt(sentence)
      });
    }
  }

  const draftPercents = discountPercents(draft);
  const offerPercents = discountPercents(offerBlob);
  const draftAmounts = amountsIn(draft);
  const offerAmounts = amountsIn(offerBlob);
  const draftSpecific = specificPhrases(draft);
  const offerSpecific = specificPhrases(offerBlob);
  const draftReduction = hasAnyReduction(draft) || hasGenericReduction(draft);
  const offerReduction = hasAnyReduction(offerBlob);

  if (draftReduction && !offerReduction) {
    push({
      kind: "invented_discount",
      detail: "Draft states a discount or price reduction, and no active offer contains one.",
      excerpt: excerpt(draft)
    });
  } else if (draftReduction) {
    for (const value of draftPercents) {
      if (!offerPercents.has(value)) {
        push({
          kind: "invented_discount",
          detail: "Draft states a percent off that is not in any active offer.",
          excerpt: excerpt(draft)
        });
        break;
      }
    }
    for (const value of draftAmounts) {
      if (!offerAmounts.has(value)) {
        push({
          kind: "invented_discount",
          detail: "Draft states an amount that is not in any active offer.",
          excerpt: excerpt(draft)
        });
        break;
      }
    }
    for (const phrase of draftSpecific) {
      if (!offerSpecific.has(phrase)) {
        push({
          kind: "invented_discount",
          detail: "Draft states a price reduction that is not in any active offer.",
          excerpt: excerpt(draft)
        });
        break;
      }
    }
  }

  const offerCodes = codesIn(offerBlob);
  for (const code of codesIn(draft)) {
    if (!offerCodes.has(code)) {
      push({
        kind: "unapproved_offer",
        detail: "Draft states a code that is not in any active offer.",
        excerpt: excerpt(draft)
      });
      break;
    }
  }

  for (const offer of inactiveOffers) {
    const name = offer.name.trim();
    if (name.length < 4) continue;
    if (!phrasePattern(name).test(draft)) continue;
    const sameActive = activeOffers.some((active) => normalize(active.name) === normalize(name));
    if (!sameActive) {
      push({
        kind: "unapproved_offer",
        detail: "Draft names an offer that is not in the active approved set.",
        excerpt: excerpt(name)
      });
    }
  }

  for (const sentence of sentences(draft)) {
    if (!/\boffer\b/i.test(sentence)) continue;
    if (activeOffers.some((offer) => coversOfferSentence(sentence, offer))) continue;
    if (inactiveOffers.some((offer) => offer.name.trim().length >= 4 && phrasePattern(offer.name).test(sentence))) continue;
    push({
      kind: "unapproved_offer",
      detail: "Draft states an offer that is not in the active approved set.",
      excerpt: excerpt(sentence)
    });
  }

  return {
    verdict: violations.length ? "rejected" : "approved",
    violations
  };
}
