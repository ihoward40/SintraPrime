from __future__ import annotations


def pick_voice(text: str) -> str:
    t = (text or "").lower()

    # Legal / enforcement
    if any(k in t for k in ["notice of dishonor", "lien", "article 9", "ucc", "affidavit"]):
        return "scribe"

    # Aggressive enforcement / fire
    if any(k in t for k in ["default", "breach", "trespass", "violation"]):
        return "dragon"

    # Banking / trust authority
    if any(k in t for k in ["trust", "secured", "collateral", "perfection"]):
        return "guardian"

    # Courtroom / judicial tone
    if any(k in t for k in ["court", "judge", "motion", "order"]):
        return "judge"

    # Educational social videos
    if any(k in t for k in ["tik tok", "tiktok", "caption", "video script", "viral"]):
        return "scholar"

    # Restorative / help / counseling
    if any(k in t for k in ["healing", "wellness", "calm", "remedy"]):
        return "angel"

    # Comedy / expose / roasting
    if any(k in t for k in ["scam", "lies", "fraud", "bs", "nonsense"]):
        return "trickster"

    # Smart fallback
    return "isiah"
