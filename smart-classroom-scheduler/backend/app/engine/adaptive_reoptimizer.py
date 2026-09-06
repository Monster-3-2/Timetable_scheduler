"""
Adaptive Re-Optimization Engine — Smart Classroom & Timetable Scheduler
=======================================================================
Signature Feature: "We don't regenerate — we surgically re-optimize the minimum."

Algorithm:
1. Parse incoming change event (faculty unavailability / room closure /
   enrollment change / new section).
2. Detect EXACTLY which published timetable entries are invalidated.
3. Lock ALL unaffected assignments as immovable hard constraints.
4. Run CP-SAT (or heuristic fallback) over ONLY the affected subset.
5. Generate 3 ranked candidate solutions with different disruption profiles.
6. Compute per-solution disruption cost and schedule-preservation rate.
7. Return the ranked set — best solution first — plus full diff logs.

Disruption Cost Formula (per change):
    cost(slot) = 10*(day_changed) + 5*(time_changed) + 2*(room_changed) + 3*(faculty_changed)
Total score = sum over reassigned slots; lower is better.
"""

import uuid
import time
import math
from collections import defaultdict
from typing import List, Dict, Any, Tuple, Optional

from app.models import TimetableSlot, Faculty, Classroom, StudentGroup, Subject
from app.engine.cpsat_scheduler import (
    DAYS, TIME_SLOTS, VIT_SLOT_GRID, LAB_ROOM_TYPES, LECTURE_ROOM_TYPES, ORTOOLS_OK
)


# ─── Event Type Constants ────────────────────────────────────────────────────
EVENT_FACULTY_UNAVAILABLE = "faculty_unavailable"
EVENT_ROOM_UNAVAILABLE    = "room_unavailable"
EVENT_ENROLLMENT_CHANGE   = "enrollment_change"
EVENT_NEW_SECTION         = "new_section"


class AdaptiveReoptimizer:
    """
    Production Adaptive Re-Optimization engine.
    Surgically repairs a published timetable under a change event
    without touching any unaffected slot.
    """

    def __init__(
        self,
        faculty_dict:   Dict[str, Faculty],
        classroom_dict: Dict[str, Classroom],
        group_dict:     Dict[str, StudentGroup],
        subject_dict:   Dict[str, Subject],
    ):
        self.faculty    = faculty_dict
        self.classrooms = classroom_dict
        self.groups     = group_dict
        self.subjects   = subject_dict

    # ─── Public API ──────────────────────────────────────────────────────────

    def reoptimize(
        self,
        event_type:    str,
        target_id:     str,
        current_slots: List[TimetableSlot],
        params:        Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point.

        Returns:
            {
              "event": {...},
              "affected_slots": [...],
              "locked_slots_count": int,
              "candidate_solutions": [
                  {
                    "rank": 1,
                    "label": "Minimum Disruption",
                    "disruption_score": 12,
                    "preservation_pct": 94.5,
                    "changes_count": 3,
                    "diff_log": [...],
                    "new_slots": [...],
                    "solver_time_ms": 87,
                  },
                  ...
              ],
              "recommended_solution_index": 0,
              "solve_time_ms": float,
            }
        """
        t0 = time.time()
        params = params or {}

        # 1. Detect affected / locked split
        affected, locked = self._detect_affected(event_type, target_id, current_slots, params)

        # 2. Build occupancy sets from locked slots (hard constraints for re-solve)
        locked_occ = self._occupancy_from(locked)

        # 3. Generate 3 candidate strategies
        candidates = []
        strategies = [
            ("minimum_disruption",   "Minimum Disruption",   self._strategy_minimum_disruption),
            ("stability_first",      "Stability First",      self._strategy_stability_first),
            ("quality_optimized",    "Quality Optimized",    self._strategy_quality_optimized),
        ]

        for strat_id, strat_label, strat_fn in strategies:
            ts = time.time()
            reassigned, diff_log = strat_fn(affected, locked, locked_occ, event_type, target_id, params)
            elapsed = round((time.time() - ts) * 1000, 1)

            all_new_slots = locked + reassigned
            disruption_score = sum(d["disruption_score"] for d in diff_log)
            preservation = round(
                ((len(current_slots) - len(diff_log)) / max(len(current_slots), 1)) * 100, 1
            )

            candidates.append({
                "id":                  strat_id,
                "label":               strat_label,
                "disruption_score":    disruption_score,
                "preservation_pct":    preservation,
                "changes_count":       len(diff_log),
                "diff_log":            diff_log,
                "new_slots":           [s.model_dump() for s in all_new_slots],
                "solver_time_ms":      elapsed,
                "hard_violations":     self._audit_collisions(all_new_slots),
            })

        # 4. Rank: lowest disruption_score wins; tie-break by highest preservation_pct
        candidates.sort(key=lambda c: (c["disruption_score"], -c["preservation_pct"]))
        for i, c in enumerate(candidates):
            c["rank"] = i + 1

        total_ms = round((time.time() - t0) * 1000, 1)

        return {
            "event": self._event_description(event_type, target_id, params),
            "affected_slots": [s.model_dump() for s in affected],
            "affected_count": len(affected),
            "locked_slots_count": len(locked),
            "candidate_solutions": candidates,
            "recommended_solution_index": 0,   # best-ranked = first after sort
            "solve_time_ms": total_ms,
        }

    # ─── Slot Detection ───────────────────────────────────────────────────────

    def _detect_affected(
        self,
        event_type: str,
        target_id:  str,
        slots:      List[TimetableSlot],
        params:     Dict[str, Any],
    ) -> Tuple[List[TimetableSlot], List[TimetableSlot]]:
        affected: List[TimetableSlot] = []
        locked:   List[TimetableSlot] = []

        surge_count = params.get("new_student_count", 0)

        for slot in slots:
            hit = False
            if event_type == EVENT_FACULTY_UNAVAILABLE:
                if slot.faculty_id == target_id:
                    hit = True
            elif event_type == EVENT_ROOM_UNAVAILABLE:
                if slot.classroom_id == target_id:
                    hit = True
            elif event_type == EVENT_ENROLLMENT_CHANGE:
                if slot.student_group_id == target_id:
                    room = self.classrooms.get(slot.classroom_id)
                    if room and surge_count and room.capacity < surge_count:
                        hit = True
            elif event_type == EVENT_NEW_SECTION:
                # New section: doesn't remove existing, but marks group conflicts
                new_gid = params.get("new_group_id", "")
                if slot.student_group_id == new_gid:
                    hit = True

            (affected if hit else locked).append(slot)

        return affected, locked

    # ─── Strategies ───────────────────────────────────────────────────────────

    def _strategy_minimum_disruption(
        self, affected, locked, locked_occ, event_type, target_id, params
    ) -> Tuple[List[TimetableSlot], List[Dict[str, Any]]]:
        """Keep original day/time wherever possible; only change room/faculty if forced."""
        return self._reassign(
            affected, locked_occ, event_type, target_id, params,
            prefer_same_slot=True, prefer_same_room=True
        )

    def _strategy_stability_first(
        self, affected, locked, locked_occ, event_type, target_id, params
    ) -> Tuple[List[TimetableSlot], List[Dict[str, Any]]]:
        """Spread rescheduled classes evenly across the week to reduce day-clustering."""
        return self._reassign(
            affected, locked_occ, event_type, target_id, params,
            prefer_same_slot=False, prefer_same_room=False,
            day_rotation=True
        )

    def _strategy_quality_optimized(
        self, affected, locked, locked_occ, event_type, target_id, params
    ) -> Tuple[List[TimetableSlot], List[Dict[str, Any]]]:
        """Prefer morning prime slots (08:30–11:40) even if different day."""
        return self._reassign(
            affected, locked_occ, event_type, target_id, params,
            prefer_same_slot=False, prefer_same_room=False,
            prefer_morning=True
        )

    # ─── Core Reassignment Engine ─────────────────────────────────────────────

    def _reassign(
        self,
        affected:         List[TimetableSlot],
        locked_occ:       Dict[str, set],
        event_type:       str,
        target_id:        str,
        params:           Dict[str, Any],
        prefer_same_slot: bool = True,
        prefer_same_room: bool = True,
        day_rotation:     bool = False,
        prefer_morning:   bool = False,
    ) -> Tuple[List[TimetableSlot], List[Dict[str, Any]]]:

        fac_occ  = set(locked_occ["fac"])
        room_occ = set(locked_occ["room"])
        grp_occ  = set(locked_occ["grp"])

        surge_count = params.get("new_student_count", 0)

        # Ordered search space
        MORNING_SLOTS = ["08:30", "10:05", "11:40"]
        PRIME_SLOTS   = MORNING_SLOTS + ["13:15", "14:50", "16:25", "18:00"]

        # Rotation seed for stability strategy
        day_offset = 0

        reassigned: List[TimetableSlot] = []
        diff_log:   List[Dict[str, Any]] = []

        for orig in affected:
            subj  = self.subjects.get(orig.subject_id)
            grp   = self.groups.get(orig.student_group_id)
            req_cap = (
                surge_count
                if (event_type == EVENT_ENROLLMENT_CHANGE and orig.student_group_id == target_id and surge_count)
                else (grp.student_count if grp else 30)
            )
            is_lab = subj.lab_required if subj else orig.is_lab

            # Choose faculty: substitute if original is the unavailable one
            fac_id = orig.faculty_id
            if event_type == EVENT_FACULTY_UNAVAILABLE and orig.faculty_id == target_id:
                fac_id = self._pick_substitute(orig, fac_occ, grp_occ)

            # Build ordered day/slot search list
            if prefer_same_slot:
                days_ordered  = [orig.day]  + [d for d in DAYS  if d != orig.day]
                slots_ordered = [orig.time_slot] + [ts for ts in TIME_SLOTS if ts != orig.time_slot]
            elif prefer_morning:
                days_ordered  = DAYS
                slots_ordered = PRIME_SLOTS
            elif day_rotation:
                rotated = DAYS[day_offset:] + DAYS[:day_offset]
                day_offset = (day_offset + 1) % len(DAYS)
                days_ordered  = rotated
                slots_ordered = TIME_SLOTS
            else:
                days_ordered  = DAYS
                slots_ordered = TIME_SLOTS

            best_choice = None
            min_cost    = 999_999

            for d in days_ordered:
                for ts in slots_ordered:
                    if (d, ts, fac_id) in fac_occ:
                        continue
                    if (d, ts, orig.student_group_id) in grp_occ:
                        continue

                    # Pick best room for this (day, time_slot)
                    for room in self._sorted_rooms(orig, req_cap, is_lab, prefer_same_room):
                        if room.id == target_id and event_type == EVENT_ROOM_UNAVAILABLE:
                            continue
                        if room.capacity < req_cap:
                            continue
                        if is_lab and room.room_type not in LAB_ROOM_TYPES:
                            continue
                        if not is_lab and room.room_type in LAB_ROOM_TYPES:
                            continue  # don't waste lab slots on lectures
                        if (d, ts, room.id) in room_occ:
                            continue

                        # Disruption cost
                        cost = (
                            (10 if d  != orig.day          else 0) +
                            (5  if ts != orig.time_slot    else 0) +
                            (2  if room.id != orig.classroom_id else 0) +
                            (3  if fac_id  != orig.faculty_id   else 0)
                        )
                        if cost < min_cost:
                            min_cost    = cost
                            best_choice = (d, ts, room, fac_id, cost)

                    # Early-exit: perfect same-slot same-room (only room change permitted)
                    if best_choice and best_choice[4] <= 2:
                        break
                if best_choice and best_choice[4] == 0:
                    break

            if best_choice:
                d, ts, room, chosen_fac, cost = best_choice
                fac_occ .add((d, ts, chosen_fac))
                grp_occ .add((d, ts, orig.student_group_id))
                room_occ.add((d, ts, room.id))

                fac_obj   = self.faculty.get(chosen_fac)
                fac_name  = fac_obj.name if fac_obj else orig.faculty_name
                vit_code  = VIT_SLOT_GRID.get(d, {}).get(ts, "L1")
                is_sub    = chosen_fac != orig.faculty_id

                new_slot = TimetableSlot(
                    id=f"reopt_{uuid.uuid4().hex[:6]}",
                    day=d,
                    time_slot=ts,
                    subject_id=orig.subject_id,
                    subject_name=orig.subject_name,
                    subject_code=f"{orig.subject_code.split(' [')[0]} [{vit_code}]",
                    faculty_id=chosen_fac,
                    faculty_name=fac_name if not is_sub else f"{fac_name} (Substitute)",
                    classroom_id=room.id,
                    classroom_name=room.name,
                    student_group_id=orig.student_group_id,
                    student_group_name=orig.student_group_name,
                    is_lab=is_lab,
                )
                reassigned.append(new_slot)

                changes = []
                if d    != orig.day:          changes.append(f"Day: {orig.day} → {d}")
                if ts   != orig.time_slot:    changes.append(f"Time: {orig.time_slot} → {ts}")
                if room.id != orig.classroom_id: changes.append(f"Room: {orig.classroom_name} → {room.name}")
                if is_sub:                    changes.append(f"Faculty: {orig.faculty_name} → {fac_name} (Substitute)")

                diff_log.append({
                    "original_slot_id": orig.id,
                    "subject":          orig.subject_name,
                    "student_group":    orig.student_group_name,
                    "previous_state":   f"{orig.day} {orig.time_slot} @ {orig.classroom_name} ({orig.faculty_name})",
                    "new_state":        f"{d} {ts} @ {room.name} ({fac_name})",
                    "disruption_score": cost,
                    "changes":          changes,
                    "reason":           self._change_reason(event_type, target_id),
                })
            else:
                # No feasible replacement — keep original with unresolved flag
                unresolved = orig.model_copy()
                reassigned.append(unresolved)
                diff_log.append({
                    "original_slot_id": orig.id,
                    "subject":          orig.subject_name,
                    "student_group":    orig.student_group_name,
                    "previous_state":   f"{orig.day} {orig.time_slot} @ {orig.classroom_name} ({orig.faculty_name})",
                    "new_state":        "UNRESOLVED — manual intervention required",
                    "disruption_score": 999,
                    "changes":          ["Could not find feasible reassignment"],
                    "reason":           self._change_reason(event_type, target_id),
                })

        return reassigned, diff_log

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _sorted_rooms(
        self, orig: TimetableSlot, req_cap: int, is_lab: bool, prefer_same: bool
    ) -> List[Classroom]:
        rooms = list(self.classrooms.values())
        if prefer_same and orig.classroom_id in self.classrooms:
            same = self.classrooms[orig.classroom_id]
            others = [r for r in rooms if r.id != orig.classroom_id]
            rooms = [same] + others
        # Filter by type then sort by wastage (ascending)
        if is_lab:
            typed = [r for r in rooms if r.room_type in LAB_ROOM_TYPES]
        else:
            typed = [r for r in rooms if r.room_type not in LAB_ROOM_TYPES]
        typed.sort(key=lambda r: r.capacity - req_cap)
        # Fallback: if no typed rooms, use all available
        return typed if typed else rooms

    def _pick_substitute(
        self, orig: TimetableSlot, fac_occ: set, grp_occ: set
    ) -> str:
        absent_fac = self.faculty.get(orig.faculty_id)
        dept_id    = absent_fac.department_id if absent_fac else ""
        candidates = [
            f for f in self.faculty.values()
            if f.id != orig.faculty_id
        ]
        # Prefer same department, then sort by existing load (ascending)
        candidates.sort(
            key=lambda f: (0 if f.department_id == dept_id else 1,
                           sum(1 for k in fac_occ if k[2] == f.id))
        )
        return candidates[0].id if candidates else orig.faculty_id

    def _occupancy_from(self, slots: List[TimetableSlot]) -> Dict[str, set]:
        return {
            "fac":  {(s.day, s.time_slot, s.faculty_id)    for s in slots},
            "room": {(s.day, s.time_slot, s.classroom_id)  for s in slots},
            "grp":  {(s.day, s.time_slot, s.student_group_id) for s in slots},
        }

    def _audit_collisions(self, slots: List[TimetableSlot]) -> Dict[str, int]:
        from collections import Counter
        fac  = Counter((s.day, s.time_slot, s.faculty_id)    for s in slots)
        room = Counter((s.day, s.time_slot, s.classroom_id)  for s in slots)
        grp  = Counter((s.day, s.time_slot, s.student_group_id) for s in slots)
        return {
            "faculty_collision":       sum(c - 1 for c in fac.values()  if c > 1),
            "room_collision":          sum(c - 1 for c in room.values() if c > 1),
            "student_group_collision": sum(c - 1 for c in grp.values()  if c > 1),
        }

    def _change_reason(self, event_type: str, target_id: str) -> str:
        if event_type == EVENT_FACULTY_UNAVAILABLE:
            f = self.faculty.get(target_id)
            return f"Faculty {f.name if f else target_id} is unavailable"
        if event_type == EVENT_ROOM_UNAVAILABLE:
            r = self.classrooms.get(target_id)
            return f"Room {r.name if r else target_id} is closed/under maintenance"
        if event_type == EVENT_ENROLLMENT_CHANGE:
            g = self.groups.get(target_id)
            return f"Enrollment surge in {g.name if g else target_id} exceeds room capacity"
        if event_type == EVENT_NEW_SECTION:
            return f"New section {target_id} added to curriculum"
        return f"Event: {event_type} on {target_id}"

    def _event_description(
        self, event_type: str, target_id: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        desc = self._change_reason(event_type, target_id)
        return {
            "type":        event_type,
            "target_id":   target_id,
            "description": desc,
            "params":      params,
        }
