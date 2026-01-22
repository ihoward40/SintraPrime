import assert from "node:assert/strict";

import { normalizePinnedNotionBlocks, pinSetDigestSha256 } from "../../src/notion/readbackNormalizer.js";

function makeCodeBlock(id: string, text: string, language = "json", lastEdited = "2026-01-19T00:00:00.000Z") {
  return {
    id,
    type: "code",
    last_edited_time: lastEdited,
    code: {
      language,
      rich_text: [{ plain_text: text }],
    },
  };
}

function expectThrowsToken(fn: () => unknown, token: string) {
  try {
    fn();
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    assert.ok(msg.includes(token), `Expected error to include ${JSON.stringify(token)} but got: ${msg}`);
    return;
  }
  assert.fail(`Expected throw including ${JSON.stringify(token)} but function returned`);
}

function run() {
  // ✅ pinned_block_id + all pins present + digest present/matching
  {
    const pins = {
      templates_block_id: "t-1",
      self_check_block_id: "s-1",
      provenance_block_id: "p-1",
    };

    const storedDigest = pinSetDigestSha256(pins);

    const out = normalizePinnedNotionBlocks({
      pin_mode: "pinned_block_id",
      pin_mode_locked: true,
      require_pin_mode_locked_when_pins_present: true,
      stored_pin_set_digest_sha256: storedDigest,
      pins,
      templates: makeCodeBlock("t-1", "{\"a\":1}\n"),
      selfCheck: makeCodeBlock("s-1", "{\"b\":2}\n"),
      provenance: makeCodeBlock("p-1", "{\"c\":3}\n"),
    });

    assert.equal(out.pins.pin_set_digest_sha256, storedDigest);
  }

  // ❌ pinned_block_id + missing one pin => PIN_SET_PARTIAL_REFUSED
  {
    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          pins: {
            templates_block_id: "t-1",
            self_check_block_id: "",
            provenance_block_id: "p-1",
          },
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "PIN_SET_PARTIAL_REFUSED"
    );
  }

  // ❌ pinned_block_id + all pins present + digest missing => PIN_SET_DIGEST_MISSING_FOR_PINNED_SET
  {
    const pins = {
      templates_block_id: "t-1",
      self_check_block_id: "s-1",
      provenance_block_id: "p-1",
    };

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          stored_pin_set_digest_sha256: "",
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "PIN_SET_DIGEST_MISSING_FOR_PINNED_SET"
    );
  }

  // ❌ heading_pair + any pin present => PIN_SET_PRESENT_BUT_MODE_NOT_PINNED
  {
    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "heading_pair",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          pins: {
            templates_block_id: "t-1",
            self_check_block_id: "",
            provenance_block_id: "",
          },
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("", "{}"),
          provenance: makeCodeBlock("", "{}"),
        }),
      "PIN_SET_PRESENT_BUT_MODE_NOT_PINNED"
    );
  }

  // ❌ invalid mode => PIN_MODE_INVALID
  {
    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_ids",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          pins: {
            templates_block_id: "",
            self_check_block_id: "",
            provenance_block_id: "",
          },
          templates: makeCodeBlock("", "{}"),
          selfCheck: makeCodeBlock("", "{}"),
          provenance: makeCodeBlock("", "{}"),
        }),
      "PIN_MODE_INVALID"
    );
  }

  // ❌ pinned_block_id + all pins present + digest present/mismatch => PIN_SET_TAMPERED
  {
    const pins = {
      templates_block_id: "t-1",
      self_check_block_id: "s-1",
      provenance_block_id: "p-1",
    };

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          stored_pin_set_digest_sha256: "0".repeat(64),
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "PIN_SET_TAMPERED"
    );
  }

  // ❌ any pins present + PIN_MODE_LOCKED != true => PIN_SET_NOT_LOCKED (must fail before digest/mode pin mismatch)
  {
    const pins = {
      templates_block_id: "t-1",
      self_check_block_id: "s-1",
      provenance_block_id: "p-1",
    };

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: false,
          require_pin_mode_locked_when_pins_present: true,
          stored_pin_set_digest_sha256: "0".repeat(64),
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "PIN_SET_NOT_LOCKED"
    );

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "heading_pair",
          pin_mode_locked: false,
          require_pin_mode_locked_when_pins_present: true,
          stored_pin_set_digest_sha256: "0".repeat(64),
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "PIN_SET_NOT_LOCKED"
    );
  }

  // ❌ pinned+locked requires LOCKED_AT when enabled
  {
    const pins = {
      templates_block_id: "t-1",
      self_check_block_id: "s-1",
      provenance_block_id: "p-1",
    };

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          require_locked_at_when_pin_mode_locked: true,
          stored_pin_set_digest_sha256: pinSetDigestSha256(pins),
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE"
    );

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          require_locked_at_when_pin_mode_locked: true,
          locked_at_iso: "not-an-iso",
          stored_pin_set_digest_sha256: pinSetDigestSha256(pins),
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "LOCK_TIMESTAMP_INVALID"
    );
  }

  // ❌ edited-after-lock must beat digest mismatch
  {
    const pins = {
      templates_block_id: "t-1",
      self_check_block_id: "s-1",
      provenance_block_id: "p-1",
    };

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          enforce_no_edits_after_locked_at: true,
          locked_at_iso: "2026-01-18T00:00:00.000Z",
          stored_pin_set_digest_sha256: "0".repeat(64),
          pins,
          templates: makeCodeBlock("t-1", "{}", "json", "2026-01-19T00:00:00.000Z"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "LOCKED_BLOCK_EDITED_AFTER_LOCK"
    );
  }

  // ❌ page edited after lock
  {
    const pins = {
      templates_block_id: "t-1",
      self_check_block_id: "s-1",
      provenance_block_id: "p-1",
    };

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          enforce_page_no_edits_after_locked_at: true,
          locked_at_iso: "2026-01-18T00:00:00.000Z",
          page_last_edited_time_iso: "2026-01-19T00:00:00.000Z",
          stored_pin_set_digest_sha256: "0".repeat(64),
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "LOCKED_PAGE_EDITED_AFTER_LOCK"
    );

    expectThrowsToken(
      () =>
        normalizePinnedNotionBlocks({
          pin_mode: "pinned_block_id",
          pin_mode_locked: true,
          require_pin_mode_locked_when_pins_present: true,
          enforce_page_no_edits_after_locked_at: true,
          locked_at_iso: "2026-01-18T00:00:00.000Z",
          page_last_edited_time_iso: "",
          stored_pin_set_digest_sha256: pinSetDigestSha256(pins),
          pins,
          templates: makeCodeBlock("t-1", "{}"),
          selfCheck: makeCodeBlock("s-1", "{}"),
          provenance: makeCodeBlock("p-1", "{}"),
        }),
      "PAGE_LAST_EDITED_TIME_INVALID"
    );
  }

  // eslint-disable-next-line no-console
  console.log("ci notion pins truth-table: ok");
}

run();
