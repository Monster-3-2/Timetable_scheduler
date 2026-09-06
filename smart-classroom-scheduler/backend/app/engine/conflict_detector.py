from typing import List, Dict, Any, Optional
from app.models import TimetableSlot, Faculty, Classroom, StudentGroup, Subject

TIME_SLOTS = ["08:30", "10:05", "11:40", "13:15", "14:50", "16:25", "18:00"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
LAB_ROOM_TYPES = {"Computer Lab", "Electronics Lab"}


class ConflictDetectorEngine:
    def __init__(
        self,
        faculty_dict: Dict[str, Faculty],
        classroom_dict: Dict[str, Classroom],
        group_dict: Dict[str, StudentGroup],
        subject_dict: Dict[str, Subject],
    ):
        self.faculty = faculty_dict
        self.classrooms = classroom_dict
        self.groups = group_dict
        self.subjects = subject_dict

    def detect_conflicts(self, slots: List[TimetableSlot]) -> List[Dict[str, Any]]:
        conflicts = []

        faculty_time_map: Dict[str, List[TimetableSlot]] = {}
        room_time_map: Dict[str, List[TimetableSlot]] = {}
        group_time_map: Dict[str, List[TimetableSlot]] = {}

        # Pre-compute occupancy sets for candidate evaluation
        occupied_rooms = {(s.day, s.time_slot, s.classroom_id) for s in slots}
        occupied_faculty = {(s.day, s.time_slot, s.faculty_id) for s in slots}
        occupied_groups = {(s.day, s.time_slot, s.student_group_id) for s in slots}

        for slot in slots:
            f_key = f"{slot.day}_{slot.time_slot}_{slot.faculty_id}"
            r_key = f"{slot.day}_{slot.time_slot}_{slot.classroom_id}"
            g_key = f"{slot.day}_{slot.time_slot}_{slot.student_group_id}"

            faculty_time_map.setdefault(f_key, []).append(slot)
            room_time_map.setdefault(r_key, []).append(slot)
            group_time_map.setdefault(g_key, []).append(slot)

            room = self.classrooms.get(slot.classroom_id)
            group = self.groups.get(slot.student_group_id)
            subj = self.subjects.get(slot.subject_id)

            # 1. Capacity Check
            if room and group and room.capacity < group.student_count:
                # Find candidate rooms that fit and are free
                candidates = []
                for cr in self.classrooms.values():
                    if cr.capacity >= group.student_count and (slot.day, slot.time_slot, cr.id) not in occupied_rooms:
                        if not slot.is_lab or cr.room_type in LAB_ROOM_TYPES:
                            candidates.append({
                                "room_id": cr.id,
                                "room_name": cr.name,
                                "capacity": cr.capacity,
                                "type": cr.room_type,
                                "suitability_score": round(min(1.0, group.student_count / cr.capacity) * 100, 1),
                            })
                candidates.sort(key=lambda c: -c["suitability_score"])

                conflicts.append({
                    "id": f"c_cap_{slot.id}",
                    "type": "Capacity Conflict",
                    "severity": "HIGH",
                    "title": f"Room Capacity Violation in {room.name}",
                    "description": f"Classroom {room.name} (Capacity {room.capacity}) assigned to group {group.name} ({group.student_count} students).",
                    "affected_slot": slot.model_dump(),
                    "suggested_fix": f"Reassign to room with capacity >= {group.student_count} (e.g. {candidates[0]['room_name'] if candidates else 'Larger Hall'}).",
                    "candidate_resolutions": candidates[:3],
                })

            # 2. Lab Requirement Check
            if subj and subj.lab_required and room and room.room_type not in LAB_ROOM_TYPES:
                lab_candidates = []
                for lr in self.classrooms.values():
                    if lr.room_type in LAB_ROOM_TYPES and lr.capacity >= (group.student_count if group else 30):
                        is_free = (slot.day, slot.time_slot, lr.id) not in occupied_rooms
                        lab_candidates.append({
                            "room_id": lr.id,
                            "room_name": lr.name,
                            "capacity": lr.capacity,
                            "is_currently_free": is_free,
                        })
                lab_candidates.sort(key=lambda c: 0 if c["is_currently_free"] else 1)

                conflicts.append({
                    "id": f"c_lab_{slot.id}",
                    "type": "Lab Conflict",
                    "severity": "HIGH",
                    "title": f"Lab Requirement Mismatch for {slot.subject_name}",
                    "description": f"{slot.subject_name} requires a laboratory, but is assigned to standard lecture room {room.name}.",
                    "affected_slot": slot.model_dump(),
                    "suggested_fix": f"Reassign slot to {lab_candidates[0]['room_name'] if lab_candidates else 'Laboratory'}.",
                    "candidate_resolutions": lab_candidates[:3],
                })

        # 3. Faculty Double-Booking
        for f_key, overlapping_slots in faculty_time_map.items():
            if len(overlapping_slots) > 1:
                f_name = overlapping_slots[0].faculty_name
                d_time = f"{overlapping_slots[0].day} at {overlapping_slots[0].time_slot}"
                subjects_str = " and ".join([s.subject_name for s in overlapping_slots])

                # Find alternative time slots where faculty and group are free
                alt_slots = self._find_free_time_candidates(overlapping_slots[1], slots)

                conflicts.append({
                    "id": f"c_fac_{f_key}",
                    "type": "Faculty Conflict",
                    "severity": "CRITICAL",
                    "title": f"Faculty Double-Booking: {f_name}",
                    "description": f"{f_name} is simultaneously assigned to teach {subjects_str} on {d_time}.",
                    "affected_slot": overlapping_slots[0].model_dump(),
                    "conflicting_slot": overlapping_slots[1].model_dump(),
                    "suggested_fix": f"Shift second class ({overlapping_slots[1].subject_name}) to an available slot.",
                    "candidate_resolutions": alt_slots[:3],
                })

        # 4. Room Double-Booking
        for r_key, overlapping_slots in room_time_map.items():
            if len(overlapping_slots) > 1:
                r_name = overlapping_slots[0].classroom_name
                d_time = f"{overlapping_slots[0].day} at {overlapping_slots[0].time_slot}"
                subjects_str = " and ".join([s.subject_name for s in overlapping_slots])

                # Find free alternative rooms at this time
                slot_to_move = overlapping_slots[1]
                grp = self.groups.get(slot_to_move.student_group_id)
                needed_cap = grp.student_count if grp else 30
                alt_rooms = []
                for room in self.classrooms.values():
                    if room.id != slot_to_move.classroom_id and room.capacity >= needed_cap:
                        if (slot_to_move.day, slot_to_move.time_slot, room.id) not in occupied_rooms:
                            if not slot_to_move.is_lab or room.room_type in LAB_ROOM_TYPES:
                                alt_rooms.append({"room_id": room.id, "room_name": room.name, "capacity": room.capacity})

                conflicts.append({
                    "id": f"c_room_{r_key}",
                    "type": "Room Conflict",
                    "severity": "CRITICAL",
                    "title": f"Classroom Double-Booking: {r_name}",
                    "description": f"Classroom {r_name} is scheduled for two classes ({subjects_str}) on {d_time}.",
                    "affected_slot": overlapping_slots[0].model_dump(),
                    "conflicting_slot": overlapping_slots[1].model_dump(),
                    "suggested_fix": f"Move one class to an available room (e.g. {alt_rooms[0]['room_name'] if alt_rooms else 'alternative room'}).",
                    "candidate_resolutions": alt_rooms[:3],
                })

        # 5. Student Group Double-Booking
        for g_key, overlapping_slots in group_time_map.items():
            if len(overlapping_slots) > 1:
                g_name = overlapping_slots[0].student_group_name
                d_time = f"{overlapping_slots[0].day} at {overlapping_slots[0].time_slot}"
                alt_slots = self._find_free_time_candidates(overlapping_slots[1], slots)
                conflicts.append({
                    "id": f"c_grp_{g_key}",
                    "type": "Student Conflict",
                    "severity": "CRITICAL",
                    "title": f"Student Group Overlap: {g_name}",
                    "description": f"Student Group {g_name} has multiple concurrent classes scheduled on {d_time}.",
                    "affected_slot": overlapping_slots[0].model_dump(),
                    "conflicting_slot": overlapping_slots[1].model_dump(),
                    "suggested_fix": f"Reschedule second subject ({overlapping_slots[1].subject_name}) to an idle period.",
                    "candidate_resolutions": alt_slots[:3],
                })

        return conflicts

    def _find_free_time_candidates(self, slot: TimetableSlot, all_slots: List[TimetableSlot]) -> List[Dict[str, str]]:
        fac = self.faculty.get(slot.faculty_id)
        candidates = []
        occupied_fac = {(s.day, s.time_slot) for s in all_slots if s.faculty_id == slot.faculty_id and s.id != slot.id}
        occupied_grp = {(s.day, s.time_slot) for s in all_slots if s.student_group_id == slot.student_group_id and s.id != slot.id}
        occupied_room = {(s.day, s.time_slot) for s in all_slots if s.classroom_id == slot.classroom_id and s.id != slot.id}

        for day in DAYS:
            avail = fac.available_slots.get(day, TIME_SLOTS) if fac else TIME_SLOTS
            for ts in TIME_SLOTS:
                if avail and ts not in avail:
                    continue
                if (day, ts) in occupied_fac or (day, ts) in occupied_grp or (day, ts) in occupied_room:
                    continue
                candidates.append({"day": day, "time_slot": ts, "description": f"{day} at {ts} (All clear)"})
        return candidates

    def fix_conflict_automatically(self, conflict: Dict[str, Any], slots: List[TimetableSlot]) -> List[TimetableSlot]:
        """
        Intelligently resolves a conflict by picking a verified valid candidate resolution.
        """
        affected_slot_data = conflict.get("affected_slot") or conflict.get("conflicting_slot")
        if not affected_slot_data:
            return slots

        slot_id = affected_slot_data.get("id")
        c_type = conflict.get("type")
        cands = conflict.get("candidate_resolutions", [])

        updated_slots = []
        for slot in slots:
            if slot.id == slot_id:
                mod_slot = slot.copy()
                if c_type in ("Capacity Conflict", "Lab Conflict", "Room Conflict"):
                    if cands and "room_id" in cands[0]:
                        mod_slot.classroom_id = cands[0]["room_id"]
                        mod_slot.classroom_name = cands[0]["room_name"]
                    else:
                        # Find any eligible room with capacity
                        for cr in self.classrooms.values():
                            if cr.id != slot.classroom_id:
                                if not slot.is_lab or cr.room_type in LAB_ROOM_TYPES:
                                    mod_slot.classroom_id = cr.id
                                    mod_slot.classroom_name = cr.name
                                    break
                elif c_type in ("Faculty Conflict", "Student Conflict"):
                    if cands and "time_slot" in cands[0]:
                        mod_slot.day = cands[0]["day"]
                        mod_slot.time_slot = cands[0]["time_slot"]
                    else:
                        free_times = self._find_free_time_candidates(slot, slots)
                        if free_times:
                            mod_slot.day = free_times[0]["day"]
                            mod_slot.time_slot = free_times[0]["time_slot"]
                updated_slots.append(mod_slot)
            else:
                updated_slots.append(slot)

        return updated_slots

