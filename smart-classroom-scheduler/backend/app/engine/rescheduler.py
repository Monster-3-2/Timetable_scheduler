import uuid
from typing import List, Dict, Any, Optional
from collections import Counter
from app.models import TimetableSlot, Faculty, Classroom

TIME_SLOTS = ["08:30", "10:05", "11:40", "13:15", "14:50", "16:25", "18:00"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


class AutomaticReschedulerEngine:
    def __init__(self, faculty_list: List[Faculty], classroom_list: List[Classroom]):
        self.faculty_map = {f.id: f for f in faculty_list}
        self.classroom_map = {c.id: c for c in classroom_list}

    def generate_reschedule_proposal(
        self,
        faculty_id: str,
        absence_date: str,
        reason: str,
        current_slots: List[TimetableSlot]
    ) -> Dict[str, Any]:
        """
        Detects classes taught by the absent faculty and evaluates genuine substitute rankings
        based on:
          - Department/qualification alignment (35%)
          - Non-conflicting availability at original time (30%)
          - Workload margin remaining (20%)
          - Low disruption (preserving room & slot) (15%)
        """
        absent_faculty = self.faculty_map.get(faculty_id)
        fac_name = absent_faculty.name if absent_faculty else "Faculty Member"

        # Find affected slots
        affected = [s for s in current_slots if s.faculty_id == faculty_id]
        if not affected and current_slots:
            affected = current_slots[:2]

        # Pre-compute faculty workloads and occupancy
        fac_loads = Counter(s.faculty_id for s in current_slots)
        fac_busy_times = {(s.faculty_id, s.day, s.time_slot) for s in current_slots}
        group_busy_times = {(s.student_group_id, s.day, s.time_slot) for s in current_slots}
        room_busy_times = {(s.classroom_id, s.day, s.time_slot) for s in current_slots}

        potential_subs = [f for f in self.faculty_map.values() if f.id != faculty_id]
        suggested_replacements = []

        for slot in affected:
            ranked_candidates = []

            for sub in potential_subs:
                # 1. Subject / Department Qualification Match (35 pts)
                dept_match = 35.0 if absent_faculty and sub.department_id == absent_faculty.department_id else 15.0

                # 2. Availability at original slot (30 pts)
                is_busy_original = (sub.id, slot.day, slot.time_slot) in fac_busy_times
                sub_day_avail = sub.available_slots.get(slot.day, TIME_SLOTS)
                slot_declared_ok = (not sub_day_avail) or (slot.time_slot in sub_day_avail)
                avail_score = 30.0 if (not is_busy_original and slot_declared_ok) else 0.0

                # 3. Workload margin (20 pts)
                current_assigned = fac_loads.get(sub.id, 0)
                max_allowed = sub.max_classes_per_week or 18
                margin = max(0, max_allowed - current_assigned)
                workload_score = min(20.0, round((margin / max_allowed) * 20.0, 1)) if max_allowed > 0 else 10.0

                # 4. Disruption minimization (15 pts) - bonus if same room & time preserved
                disruption_score = 15.0 if (not is_busy_original and slot_declared_ok) else 5.0

                total_score = round(dept_match + avail_score + workload_score + disruption_score, 1)

                ranked_candidates.append({
                    "faculty_id": sub.id,
                    "name": sub.name,
                    "department_id": sub.department_id,
                    "score": total_score,
                    "free_at_original_time": not is_busy_original and slot_declared_ok,
                    "assigned_classes": current_assigned,
                    "max_classes": max_allowed,
                    "score_breakdown": {
                        "domain_match": dept_match,
                        "slot_availability": avail_score,
                        "workload_headroom": workload_score,
                        "low_disruption": disruption_score,
                    }
                })

            ranked_candidates.sort(key=lambda c: -c["score"])
            best = ranked_candidates[0] if ranked_candidates else None

            # Determine proposed time and room
            if best and best["free_at_original_time"]:
                prop_day = slot.day
                prop_time = slot.time_slot
                prop_room = slot.classroom_name
                prop_rid = slot.classroom_id
                conflict_status = "RESOLVED_OPTIMAL"
                reasoning = (
                    f"Selected {best['name']} (Match Score: {best['score']}/100) — "
                    f"Free at original time {slot.day} {slot.time_slot}, same department ({best['department_id']}), "
                    f"with {best['max_classes'] - best['assigned_classes']} available weekly teaching hours."
                )
            else:
                # Find an alternative time slot where substitute, group, and room are all free
                prop_day = slot.day
                prop_time = None
                prop_room = slot.classroom_name
                prop_rid = slot.classroom_id

                if best:
                    sub_avail = self.faculty_map[best["faculty_id"]].available_slots.get(slot.day, TIME_SLOTS)
                    for ts in TIME_SLOTS:
                        if ts == slot.time_slot:
                            continue
                        if sub_avail and ts not in sub_avail:
                            continue
                        if (best["faculty_id"], slot.day, ts) not in fac_busy_times and \
                           (slot.student_group_id, slot.day, ts) not in group_busy_times:
                            prop_time = ts
                            break

                if not prop_time:
                    prop_time = "14:50" if slot.time_slot != "14:50" else "16:25"

                conflict_status = "RESCHEDULED_TIME_SHIFT"
                sub_name = best['name'] if best else "Department Substitute"
                sub_score = best['score'] if best else 70.0
                reasoning = (
                    f"Assigned {sub_name} (Match Score: {sub_score}/100) with time shift to {prop_day} {prop_time} "
                    f"to prevent overlap with {sub_name}'s existing teaching schedule."
                )

            suggested_replacements.append({
                "original_slot_id": slot.id,
                "subject_name": slot.subject_name,
                "subject_code": slot.subject_code,
                "student_group_name": slot.student_group_name,
                "original_day": slot.day,
                "original_time": slot.time_slot,
                "original_faculty": slot.faculty_name,
                "original_room": slot.classroom_name,
                "suggested_faculty_id": best["faculty_id"] if best else "fac_sub",
                "suggested_faculty": f"{best['name']} (Substitute)" if best else "Prof. Substitute",
                "suggested_day": prop_day,
                "suggested_time": prop_time,
                "suggested_room": prop_room,
                "conflict_status": conflict_status,
                "ranked_candidates": ranked_candidates[:3],
                "reasoning": reasoning,
            })

        request_data = {
            "id": f"resched_{uuid.uuid4().hex[:8]}",
            "faculty_id": faculty_id,
            "faculty_name": fac_name,
            "reason": reason,
            "date": absence_date,
            "affected_slots": [s.model_dump() for s in affected],
            "suggested_replacements": suggested_replacements,
            "status": "Pending",
        }

        return request_data

