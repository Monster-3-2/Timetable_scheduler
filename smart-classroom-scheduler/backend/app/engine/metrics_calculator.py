"""
Metrics Calculator — Smart Classroom & Timetable Scheduler
===========================================================
Computes live, technically authentic timetable performance metrics
directly from actual TimetableSlot records and database resources.
No hardcoded percentages or mock stats.
"""

import math
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional

from app.models import TimetableSlot, Faculty, Classroom, StudentGroup, Subject

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
TIME_SLOTS = ["08:30", "10:05", "11:40", "13:15", "14:50", "16:25", "18:00"]
LAB_ROOM_TYPES = {"Computer Lab", "Electronics Lab"}


class MetricsCalculator:
    """
    Computes genuine mathematical metrics from active timetable slots.
    """

    def __init__(
        self,
        slots: List[TimetableSlot],
        faculty_map: Dict[str, Faculty],
        classroom_map: Dict[str, Classroom],
        student_group_map: Dict[str, StudentGroup],
        subject_map: Dict[str, Subject],
    ):
        self.slots = slots
        self.faculty = faculty_map
        self.classrooms = classroom_map
        self.student_groups = student_group_map
        self.subjects = subject_map

    @classmethod
    def from_db(cls, slots: List[TimetableSlot], db_instance) -> "MetricsCalculator":
        fac_map = db_instance.faculty if isinstance(db_instance.faculty, dict) else {f.id: f for f in db_instance.faculty}
        cr_map = db_instance.classrooms if isinstance(db_instance.classrooms, dict) else {c.id: c for c in db_instance.classrooms}
        sg_map = db_instance.student_groups if isinstance(db_instance.student_groups, dict) else {sg.id: sg for sg in db_instance.student_groups}
        subj_map = db_instance.subjects if isinstance(db_instance.subjects, dict) else {s.id: s for s in db_instance.subjects}
        return cls(
            slots=slots,
            faculty_map=fac_map,
            classroom_map=cr_map,
            student_group_map=sg_map,
            subject_map=subj_map,
        )

    def compute(self) -> Dict[str, Any]:
        total_slots = len(self.slots)
        if total_slots == 0:
            return self._empty_metrics()

        # 1. Faculty Workload & Balance
        fac_counts = Counter(s.faculty_id for s in self.slots)
        faculty_breakdown = []
        loads = []
        for fid, fac in self.faculty.items():
            assigned = fac_counts.get(fid, 0)
            max_limit = fac.max_classes_per_week or 18
            utilization = round((assigned / max_limit) * 100, 1) if max_limit > 0 else 0.0
            loads.append(assigned)
            faculty_breakdown.append({
                "faculty_id": fid,
                "name": fac.name,
                "department_id": fac.department_id,
                "assigned_hours": assigned,
                "max_hours": max_limit,
                "utilization_pct": utilization,
            })

        avg_load = sum(loads) / len(loads) if loads else 0.0
        variance = sum((l - avg_load) ** 2 for l in loads) / len(loads) if loads else 0.0
        std_dev = math.sqrt(variance)
        workload_balance_pct = max(0.0, round(100.0 - (std_dev / max(avg_load, 1.0)) * 100, 1))

        # 2. Room Utilization & Capacity Efficiency
        total_room_opportunities = len(self.classrooms) * len(DAYS) * len(TIME_SLOTS)
        unique_room_slots = {(s.classroom_id, s.day, s.time_slot) for s in self.slots}
        room_utilization_pct = (
            round((len(unique_room_slots) / total_room_opportunities) * 100, 1)
            if total_room_opportunities > 0 else 0.0
        )

        room_counts = Counter(s.classroom_id for s in self.slots)
        room_breakdown = []
        cap_util_ratios = []
        for rid, room in self.classrooms.items():
            occupied_count = room_counts.get(rid, 0)
            possible = len(DAYS) * len(TIME_SLOTS)
            util_rate = round((occupied_count / possible) * 100, 1) if possible > 0 else 0.0
            room_breakdown.append({
                "classroom_id": rid,
                "name": room.name,
                "type": room.room_type,
                "capacity": room.capacity,
                "booked_slots": occupied_count,
                "utilization_pct": util_rate,
            })

        for s in self.slots:
            room = self.classrooms.get(s.classroom_id)
            group = self.student_groups.get(s.student_group_id)
            if room and group and room.capacity > 0:
                cap_util_ratios.append(min(1.0, group.student_count / room.capacity))

        avg_capacity_efficiency = (
            round((sum(cap_util_ratios) / len(cap_util_ratios)) * 100, 1)
            if cap_util_ratios else 0.0
        )

        # 3. Student Gaps & Daily Distribution
        ts_order = {ts: i for i, ts in enumerate(TIME_SLOTS)}
        grp_day_indices: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: defaultdict(list))
        for s in self.slots:
            idx = ts_order.get(s.time_slot, 0)
            grp_day_indices[s.student_group_id][s.day].append(idx)

        total_gaps = 0
        total_student_days = 0
        for gid, day_map in grp_day_indices.items():
            for day, indices in day_map.items():
                total_student_days += 1
                if len(indices) > 1:
                    srt = sorted(indices)
                    span = srt[-1] - srt[0] + 1
                    total_gaps += max(0, span - len(srt))

        # 4. Lab Compliance
        lab_slots = [s for s in self.slots if s.is_lab]
        valid_lab_placements = 0
        for s in lab_slots:
            room = self.classrooms.get(s.classroom_id)
            if room and room.room_type in LAB_ROOM_TYPES:
                valid_lab_placements += 1
        lab_compliance_pct = (
            round((valid_lab_placements / len(lab_slots)) * 100, 1)
            if lab_slots else 100.0
        )

        # 5. Day & Time Slot Distribution
        day_distribution = Counter(s.day for s in self.slots)
        slot_distribution = Counter(s.time_slot for s in self.slots)

        # 6. Conflicts Validation
        fac_occupancy = Counter((s.faculty_id, s.day, s.time_slot) for s in self.slots)
        room_occupancy = Counter((s.classroom_id, s.day, s.time_slot) for s in self.slots)
        grp_occupancy = Counter((s.student_group_id, s.day, s.time_slot) for s in self.slots)

        fac_conflicts = sum(count - 1 for count in fac_occupancy.values() if count > 1)
        room_conflicts = sum(count - 1 for count in room_occupancy.values() if count > 1)
        grp_conflicts = sum(count - 1 for count in grp_occupancy.values() if count > 1)
        total_conflicts = fac_conflicts + room_conflicts + grp_conflicts

        # 7. Deductive Optimization Score
        score = 100.0
        score -= min(15.0, std_dev * 2.5)  # Workload std dev deduction
        if room_utilization_pct < 30.0:
            score -= (30.0 - room_utilization_pct) * 0.3
        score -= min(10.0, total_gaps * 0.5)
        score -= (100.0 - lab_compliance_pct) * 0.3
        score -= min(30.0, total_conflicts * 10.0)
        overall_score = round(max(50.0, min(99.5, score)), 1)

        return {
            "overall_optimization_score": overall_score,
            "total_slots": total_slots,
            "conflicts_count": total_conflicts,
            "conflicts_breakdown": {
                "faculty_conflicts": fac_conflicts,
                "room_conflicts": room_conflicts,
                "student_group_conflicts": grp_conflicts,
            },
            "workload_balance": {
                "balance_percentage": workload_balance_pct,
                "std_deviation": round(std_dev, 2),
                "average_classes": round(avg_load, 1),
                "faculty_stats": faculty_breakdown,
            },
            "room_utilization": {
                "overall_utilization_pct": room_utilization_pct,
                "average_capacity_efficiency_pct": avg_capacity_efficiency,
                "rooms_monitored": len(self.classrooms),
                "room_breakdown": room_breakdown,
            },
            "student_schedule_efficiency": {
                "total_idle_gap_slots": total_gaps,
                "active_student_days": total_student_days,
            },
            "lab_compliance": {
                "compliance_pct": lab_compliance_pct,
                "total_lab_sessions": len(lab_slots),
                "properly_equipped": valid_lab_placements,
            },
            "distributions": {
                "by_day": dict(day_distribution),
                "by_time_slot": dict(slot_distribution),
            },
        }

    def _empty_metrics(self) -> Dict[str, Any]:
        return {
            "overall_optimization_score": 0.0,
            "total_slots": 0,
            "conflicts_count": 0,
            "conflicts_breakdown": {"faculty_conflicts": 0, "room_conflicts": 0, "student_group_conflicts": 0},
            "workload_balance": {"balance_percentage": 0.0, "std_deviation": 0.0, "average_classes": 0.0, "faculty_stats": []},
            "room_utilization": {"overall_utilization_pct": 0.0, "average_capacity_efficiency_pct": 0.0, "rooms_monitored": len(self.classrooms), "room_breakdown": []},
            "student_schedule_efficiency": {"total_idle_gap_slots": 0, "active_student_days": 0},
            "lab_compliance": {"compliance_pct": 100.0, "total_lab_sessions": 0, "properly_equipped": 0},
            "distributions": {"by_day": {}, "by_time_slot": {}},
        }
