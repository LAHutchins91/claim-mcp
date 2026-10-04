import { describe, expect, it } from "vitest";
import { checkBrandCopy } from "../src/lib/claim-check.js";

const claim = (statement: string, status = "APPROVED") => ({ statement, status });
const offer = (name: string, terms: string, active = true) => ({ name, terms, active });

describe("checkBrandCopy", () => {
  it("approves ordinary copy that does not invent a promise or an offer", () => {
    const result = checkBrandCopy({
      draft: "Northwind makes a wool coat for cold mornings.",
      claims: [claim("The coat is sewn in Portland.")],
      offers: [],
      bannedPhrases: []
    });
    expect(result.verdict).toBe("approved");
    expect(result.violations).toEqual([]);
  });

  it("rejects a banned phrase without matching inside a longer word", () => {
    const banned = checkBrandCopy({
      draft: "This is the best in class coat.",
      claims: [],
      offers: [],
      bannedPhrases: [{ phrase: "best in class" }]
    });
    expect(banned.verdict).toBe("rejected");
    expect(banned.violations.map((item) => item.kind)).toEqual(["banned_phrase"]);

    const longerWord = checkBrandCopy({
      draft: "The winter coat is ready.",
      claims: [],
      offers: [],
      bannedPhrases: [{ phrase: "win" }]
    });
    expect(longerWord.verdict).toBe("approved");
  });

  it("rejects an invented guarantee and allows the approved sentence", () => {
    const approved = "We guarantee on-time delivery.";
    const invented = checkBrandCopy({
      draft: "We guarantee you will love it.",
      claims: [claim(approved)],
      offers: [],
      bannedPhrases: []
    });
    expect(invented.violations.map((item) => item.kind)).toContain("invented_guarantee");

    const allowed = checkBrandCopy({
      draft: "Remember: We guarantee on-time delivery.",
      claims: [claim(approved)],
      offers: [],
      bannedPhrases: []
    });
    expect(allowed.verdict).toBe("approved");
  });

  it("does not let a retired claim cover a guarantee", () => {
    const result = checkBrandCopy({
      draft: "We guarantee on-time delivery.",
      claims: [claim("We guarantee on-time delivery.", "RETIRED")],
      offers: [],
      bannedPhrases: []
    });
    expect(result.violations.map((item) => item.kind)).toContain("invented_guarantee");
  });

  it("rejects a guarantee sentence that adds a number the claim does not contain", () => {
    const result = checkBrandCopy({
      draft: "We guarantee on-time delivery in 2 days.",
      claims: [claim("We guarantee on-time delivery.")],
      offers: [],
      bannedPhrases: []
    });
    expect(result.violations.map((item) => item.kind)).toContain("invented_guarantee");
  });

  it("does not treat lifetime value as a guarantee", () => {
    const result = checkBrandCopy({
      draft: "The lifetime value of a customer matters.",
      claims: [],
      offers: [],
      bannedPhrases: []
    });
    expect(result.verdict).toBe("approved");
  });

  it("rejects a lifetime warranty that no claim covers", () => {
    const result = checkBrandCopy({
      draft: "Every frame includes a lifetime warranty.",
      claims: [],
      offers: [],
      bannedPhrases: []
    });
    expect(result.violations.map((item) => item.kind)).toContain("invented_guarantee");
  });

  it("rejects a discount when no active offer contains one", () => {
    const result = checkBrandCopy({
      draft: "Take 20 percent off this week.",
      claims: [],
      offers: [offer("Archive", "20 percent off", false)],
      bannedPhrases: []
    });
    expect(result.violations.map((item) => item.kind)).toContain("invented_discount");
  });

  it("allows a discount that matches an active offer and rejects a different percent", () => {
    const offers = [offer("Welcome", "20 percent off the first month")];
    const allowed = checkBrandCopy({
      draft: "Welcome readers can take 20 percent off the first month.",
      claims: [],
      offers,
      bannedPhrases: []
    });
    expect(allowed.verdict).toBe("approved");

    const invented = checkBrandCopy({
      draft: "Take 50 percent off the first month.",
      claims: [],
      offers,
      bannedPhrases: []
    });
    expect(invented.violations.map((item) => item.kind)).toContain("invented_discount");
  });

  it("allows the word discount when an active offer already states a percent off", () => {
    const result = checkBrandCopy({
      draft: "A discount is available on the first month.",
      claims: [],
      offers: [offer("Welcome", "20 percent off the first month")],
      bannedPhrases: []
    });
    expect(result.verdict).toBe("approved");
  });

  it("rejects half off when the active offer is a different reduction", () => {
    const result = checkBrandCopy({
      draft: "Everything is half off today.",
      claims: [],
      offers: [offer("Welcome", "20 percent off the first month")],
      bannedPhrases: []
    });
    expect(result.violations.map((item) => item.kind)).toContain("invented_discount");
  });

  it("rejects a code and an offer statement that are not in the active set", () => {
    const offers = [offer("Welcome", "20 percent off with code WELCOME")];
    const badCode = checkBrandCopy({
      draft: "Use code SAVE20 at checkout.",
      claims: [],
      offers,
      bannedPhrases: []
    });
    expect(badCode.violations.map((item) => item.kind)).toContain("unapproved_offer");

    const badOffer = checkBrandCopy({
      draft: "Our offer is a tote bag with every plan.",
      claims: [],
      offers,
      bannedPhrases: []
    });
    expect(badOffer.violations.map((item) => item.kind)).toContain("unapproved_offer");

    const named = checkBrandCopy({
      draft: "The Spring Clearance is still available.",
      claims: [],
      offers: [offer("Spring Clearance", "10 percent off", false), ...offers],
      bannedPhrases: []
    });
    expect(named.violations.map((item) => item.kind)).toContain("unapproved_offer");
  });

  it("approves an offer sentence covered by active terms", () => {
    const result = checkBrandCopy({
      draft: "Our offer is 20 percent off the first month.",
      claims: [],
      offers: [offer("Welcome", "20 percent off the first month")],
      bannedPhrases: []
    });
    expect(result.verdict).toBe("approved");
  });
});
