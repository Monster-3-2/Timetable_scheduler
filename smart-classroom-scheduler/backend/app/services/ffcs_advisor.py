"""
FFCS Smart Advisor
==================
ADDED MODULE (does not modify any existing file's logic — only imported into it).

Adds three capabilities requested for the "Find Best Faculty" (FFCS) flow:

1. classify_slot_period() / resolve_slot_tokens()
   Maps a VIT slot code (e.g. "A11", "A11+D12") to Morning / Evening using the
   project's own authentic VIT_SLOT_GRID (imported from app.database — the same
   grid the seeded demo timetable already uses), so the classification is
   derived from real project data rather than a guessed timing chart.

2. differentiate_tied_ratings() / apply_preferred_period_boost()
   - When multiple faculty share the exact same "Overall" rating, this assigns
     each a tiny, deterministic "displayScore" (never more than 0.09 below the
     original) so the list doesn't show identical numbers, while every
     candidate stays in the same "good" tier. The original overallScore is
     never altered — displayScore is a new, additive field.
   - When a student states a Morning/Evening timing preference, candidates
     whose slot matches that preference are bubbled up (still ranked by score
     within the match/no-match groups).

3. FFCSHistoryStore + compute_campus_fit()
   Persists each student's confirmed best-faculty pick (subject, faculty,
   slot, rating) to a small JSON file so future recommendations can reference
   it ("saved for further suggestions"). compute_campus_fit() uses that saved
   history to warn/encourage based on whether a new slot clusters efficiently
   with the student's other saved classes on the same day (back-to-back) or
   forces an extra, isolated campus trip — the "don't make students run around
   campus" requirement, scoped to what this data actually supports (day/time
   clustering; classroom/building isn't assigned until the admin timetable is
   generated, so this module does not guess building distances).
"""

import os
import json
import re
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.database import VIT_SLOT_GRID, DAYS

# ---------------------------------------------------------------------------
# 1. Slot -> Day/Time/Period resolution (built from the project's real grid)
# ---------------------------------------------------------------------------

TIME_ORDER = ["08:30", "10:05", "11:40", "13:15", "14:50", "16:25", "18:00"]
_MORNING_TIMES = {"08:30", "10:05", "11:40"}


def _build_reverse_grid() -> Dict[str, Dict[str, str]]:
    reverse: Dict[str, Dict[str, str]] = {}
    for day, mapping in VIT_SLOT_GRID.items():
        for time_str, code in mapping.items():
            reverse[code.strip().upper()] = {"day": day, "time": time_str}
    return reverse


_REVERSE_SLOT_GRID = _build_reverse_grid()


def _period_for_time(time_str: Optional[str]) -> str:
    if not time_str:
        return "Unknown"
    return "Morning" if time_str in _MORNING_TIMES else "Evening"


def resolve_slot_tokens(slot_field: Optional[str]) -> List[Dict[str, Any]]:
    """Splits a (possibly composite) slot string like 'A11+D12' into resolved
    {code, day, time, period} entries using the authentic VIT_SLOT_GRID."""
    if not slot_field:
        return []
    tokens = [t.strip().upper() for t in re.split(r'[+,/\s]+', slot_field) if t.strip()]
    resolved = []
    for token in tokens:
        hit = _REVERSE_SLOT_GRID.get(token)
        if hit:
            resolved.append({
                "code": token,
                "day": hit["day"],
                "time": hit["time"],
                "period": _period_for_time(hit["time"])
            })
        else:
            resolved.append({"code": token, "day": None, "time": None, "period": "Unknown"})
    return resolved


def classify_slot_period(slot_field: Optional[str]) -> str:
    """Returns 'Morning', 'Evening', 'Mixed', or 'Unknown' for a slot code."""
    resolved = resolve_slot_tokens(slot_field)
    periods = {r["period"] for r in resolved if r["period"] != "Unknown"}
    if not periods:
        return "Unknown"
    if len(periods) == 1:
        return periods.pop()
    return "Mixed"


# ---------------------------------------------------------------------------
# 2. Tie differentiation + timing-preference boost
# ---------------------------------------------------------------------------

def _stable_jitter(name: str) -> float:
    """Deterministic (not random) tiny value from a faculty's name, used only
    to break ties consistently across requests."""
    digest = hashlib.md5((name or "").encode("utf-8")).hexdigest()
    val = int(digest[:8], 16) / 0xFFFFFFFF  # 0..1
    return val


def differentiate_tied_ratings(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Adds a 'displayScore' field. Candidates sharing the same rounded
    overallScore get slightly different (but still close, still 'good')
    display scores so the UI never shows duplicate numbers. Order of the
    input list is preserved; only new fields are added to each item."""
    groups: Dict[float, List[Dict[str, Any]]] = {}
    for c in candidates:
        key = round(c.get("overallScore") or 0.0, 1)
        groups.setdefault(key, []).append(c)

    for base_score, group in groups.items():
        if len(group) <= 1:
            for c in group:
                c["displayScore"] = c.get("overallScore")
                c["ratingDifferentiated"] = False
            continue

        def _rank_key(c: Dict[str, Any]):
            return (
                c.get("teachingScore") or 0,
                c.get("evaluationScore") or 0,
                c.get("behaviourScore") or 0,
                c.get("internalsScore") or 0,
                c.get("availableSeats") or 0,
                _stable_jitter(c.get("facultyName", "")),
            )

        ordered = sorted(group, key=_rank_key, reverse=True)
        for idx, c in enumerate(ordered):
            offset = round(idx * 0.02, 2)
            # Never drop more than 0.09 — all tied candidates stay in the same "good" tier.
            c["displayScore"] = round(max(base_score - offset, base_score - 0.09), 2)
            c["ratingDifferentiated"] = idx > 0

    return candidates


def apply_preferred_period_boost(candidates: List[Dict[str, Any]], preferred_period: Optional[str]) -> List[Dict[str, Any]]:
    """Reorders candidates so ones matching the student's stated Morning/Evening
    preference are prioritized, while still respecting rating within each group."""
    pref = (preferred_period or "").strip().lower()
    if pref not in ("morning", "evening"):
        return candidates

    def _key(c: Dict[str, Any]):
        matches = 1 if (c.get("period", "").lower() == pref) else 0
        return (matches, round(c.get("overallScore") or 0.0, 1), c.get("availableSeats") or 0)

    return sorted(candidates, key=_key, reverse=True)


# ---------------------------------------------------------------------------
# 3. Persistent per-student history + campus-fit scoring
# ---------------------------------------------------------------------------

_HISTORY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "student_ffcs_history.json")


class FFCSHistoryStore:
    """Tiny JSON-file-backed store: student_id -> list of saved selections.
    Lets a student's earlier FFCS picks inform later recommendations."""

    def __init__(self, path: str):
        self.path = path
        self.data: Dict[str, List[Dict[str, Any]]] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception as e:
                print(f"[FFCSHistoryStore] Could not read {self.path}: {e}")
                self.data = {}

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            print(f"[FFCSHistoryStore] Could not write {self.path}: {e}")

    def save_selection(self, student_id: str, selection: Dict[str, Any]):
        if not student_id:
            return
        self.data.setdefault(student_id, [])
        subject = selection.get("subject")
        # Replace any earlier saved pick for the same subject rather than duplicating it.
        self.data[student_id] = [s for s in self.data[student_id] if s.get("subject") != subject]
        self.data[student_id].append(selection)
        self._save()

    def get_history(self, student_id: str) -> List[Dict[str, Any]]:
        return self.data.get(student_id, [])


ffcs_history_store = FFCSHistoryStore(_HISTORY_FILE)


def get_student_history(student_id: str) -> List[Dict[str, Any]]:
    return ffcs_history_store.get_history(student_id)


def save_selection_to_history(student_id: str, best_item: Dict[str, Any]):
    ffcs_history_store.save_selection(student_id, {
        "subject": best_item.get("subject"),
        "facultyName": best_item.get("facultyName"),
        "slot": best_item.get("slot"),
        "period": best_item.get("period"),
        "overallScore": best_item.get("overallScore"),
        "displayScore": best_item.get("displayScore"),
        "slotResolved": resolve_slot_tokens(best_item.get("slot", "")),
        "timestamp": datetime.utcnow().isoformat()
    })


def compute_campus_fit(candidate_slot_field: str, student_id: Optional[str]) -> Dict[str, Any]:
    """Best-effort 'don't make the student run around campus' check: compares
    a candidate slot's day/time against the student's other SAVED classes to
    flag isolated single-class days or large idle gaps, and to praise
    back-to-back scheduling. Scoped to day/time only (see module docstring)."""
    resolved = [r for r in resolve_slot_tokens(candidate_slot_field) if r.get("day")]
    if not resolved:
        return {
            "campusFitScore": None,
            "campusTips": ["Slot code didn't match the known VIT slot grid, so campus-fit couldn't be evaluated."]
        }

    history = ffcs_history_store.get_history(student_id) if student_id else []
    day_times: Dict[str, set] = {}
    for h in history:
        for r in h.get("slotResolved", []):
            if r.get("day") and r.get("time") in TIME_ORDER:
                day_times.setdefault(r["day"], set()).add(TIME_ORDER.index(r["time"]))

    tips: List[str] = []
    score = 100
    for r in resolved:
        day, time_str = r["day"], r["time"]
        if time_str not in TIME_ORDER:
            continue
        idx = TIME_ORDER.index(time_str)
        existing = day_times.get(day, set())
        if not existing:
            tips.append(
                f"This adds a class on {day} with no other saved classes that day — you may need a separate campus trip just for this one."
            )
            score -= 20
        else:
            nearest_gap = min(abs(idx - e) for e in existing)
            if nearest_gap == 1:
                tips.append(f"Good fit: this slot on {day} sits back-to-back with another saved class — no idle time between them.")
            elif nearest_gap >= 3:
                tips.append(f"Heads up: on {day} there's a {nearest_gap}-slot gap to your nearest saved class — you may be idle on campus in between.")
                score -= 10

    if not tips:
        tips.append("No prior saved picks yet to compare against — as you save more subjects, this gets more useful.")

    return {"campusFitScore": max(0, min(100, score)), "campusTips": tips}
