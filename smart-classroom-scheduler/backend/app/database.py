import json
import os
from typing import Dict, List, Any, Optional
from app.models import (
    User, Department, StudentGroup, Subject, Classroom, Faculty, Timetable, TimetableSlot,
    RescheduleRequest, Notification
)

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "data_store.json")

# Authentic VIT University Days & Slot Structure
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

VIT_TIME_SLOTS = [
    {"slot": "08:30 - 10:00", "id": "S1"},
    {"slot": "10:05 - 11:35", "id": "S2"},
    {"slot": "11:40 - 13:10", "id": "S3"},
    {"slot": "13:15 - 14:45", "id": "S4"},
    {"slot": "14:50 - 16:20", "id": "S5"},
    {"slot": "16:25 - 17:55", "id": "S6"},
    {"slot": "18:00 - 19:30", "id": "S7"}
]

TIME_SLOTS = ["08:30", "10:05", "11:40", "13:15", "14:50", "16:25", "18:00"]

# Official VIT Slot Codes Mapping
VIT_SLOT_GRID = {
    "Monday":    {"08:30": "A11", "10:05": "B11", "11:40": "C11", "13:15": "A21", "14:50": "A14", "16:25": "B21", "18:00": "C21"},
    "Tuesday":   {"08:30": "D11", "10:05": "E11", "11:40": "F11", "13:15": "D21", "14:50": "E14", "16:25": "E21", "18:00": "F21"},
    "Wednesday": {"08:30": "A12", "10:05": "B12", "11:40": "C12", "13:15": "A22", "14:50": "B14", "16:25": "B22", "18:00": "A24"},
    "Thursday":  {"08:30": "D12", "10:05": "E12", "11:40": "F12", "13:15": "D22", "14:50": "F14", "16:25": "E22", "18:00": "F22"},
    "Friday":    {"08:30": "A13", "10:05": "B13", "11:40": "C13", "13:15": "A23", "14:50": "C14", "16:25": "B23", "18:00": "B24"},
    "Saturday":  {"08:30": "D13", "10:05": "E13", "11:40": "F13", "13:15": "D23", "14:50": "D14", "16:25": "D24", "18:00": "E23"}
}

class Database:
    def __init__(self):
        self.users: List[User] = []
        self.departments: List[Department] = []
        self.student_groups: List[StudentGroup] = []
        self.subjects: List[Subject] = []
        self.classrooms: List[Classroom] = []
        self.faculty: List[Faculty] = []
        self.timetables: List[Timetable] = []
        self.reschedule_requests: List[RescheduleRequest] = []
        self.notifications: List[Notification] = []
        self.seed_default_data()

    def seed_default_data(self):
        # Departments
        self.departments = [
            Department(id="dept_cse", name="Computer Science & Engineering", code="CSE", head_of_department="Dr. Rahul Sharma"),
            Department(id="dept_ece", name="Electronics & Communication Engineering", code="ECE", head_of_department="Dr. Ananya Sen"),
            Department(id="dept_it", name="Information Technology", code="IT", head_of_department="Dr. Suresh Nair")
        ]

        # Student Groups / Sections
        self.student_groups = [
            StudentGroup(id="sg_cse_4a", name="B.Tech CSE Sem 4 Sec A", department_id="dept_cse", course="B.Tech", semester=4, section="A", student_count=60),
            StudentGroup(id="sg_cse_4b", name="B.Tech CSE Sem 4 Sec B", department_id="dept_cse", course="B.Tech", semester=4, section="B", student_count=55),
            StudentGroup(id="sg_ece_4a", name="B.Tech ECE Sem 4 Sec A", department_id="dept_ece", course="B.Tech", semester=4, section="A", student_count=50),
            StudentGroup(id="sg_cse_2a", name="M.Tech CSE Sem 2 Sec A", department_id="dept_cse", course="M.Tech", semester=2, section="A", student_count=30)
        ]

        # Classrooms & Labs
        self.classrooms = [
            Classroom(id="room_c301", name="SJT 301", building="Silver Jubilee Tower", capacity=70, room_type="Lecture Room", status="Available"),
            Classroom(id="room_c302", name="SJT 302", building="Silver Jubilee Tower", capacity=65, room_type="Lecture Room", status="Available"),
            Classroom(id="room_c204", name="TT 204", building="Technology Tower", capacity=80, room_type="Lecture Room", status="Available"),
            Classroom(id="room_lab1", name="SJT Computer Lab 1", building="Silver Jubilee Tower", capacity=60, room_type="Computer Lab", status="Available"),
            Classroom(id="room_lab2", name="SJT Computer Lab 2", building="Silver Jubilee Tower", capacity=45, room_type="Computer Lab", status="Available"),
            Classroom(id="room_elab", name="TT Electronics Lab", building="Technology Tower", capacity=50, room_type="Electronics Lab", status="Available"),
            Classroom(id="room_sem1", name="MB Seminar Hall 1", building="Main Building", capacity=120, room_type="Seminar Hall", status="Available")
        ]

        # Default Availability slots for all days
        full_slots = {day: TIME_SLOTS.copy() for day in DAYS}

        # Faculty Members
        self.faculty = [
            Faculty(
                id="fac_rahul",
                name="Dr. Rahul Sharma",
                employee_id="EMP1001",
                department_id="dept_cse",
                email="dr.sharma@vit.ac.in",
                subjects=["subj_ai", "subj_dsa"],
                max_classes_per_day=4,
                max_classes_per_week=16,
                available_days=DAYS.copy(),
                available_slots=full_slots.copy()
            ),
            Faculty(
                id="fac_priya",
                name="Dr. Priya Patel",
                employee_id="EMP1002",
                department_id="dept_cse",
                email="dr.patel@vit.ac.in",
                subjects=["subj_dbms", "subj_dbms_lab"],
                max_classes_per_day=4,
                max_classes_per_week=16,
                available_days=DAYS.copy(),
                available_slots=full_slots.copy()
            ),
            Faculty(
                id="fac_vikram",
                name="Prof. Vikram Singh",
                employee_id="EMP1003",
                department_id="dept_cse",
                email="prof.singh@vit.ac.in",
                subjects=["subj_dsa_lab", "subj_se"],
                max_classes_per_day=4,
                max_classes_per_week=16,
                available_days=DAYS.copy(),
                available_slots=full_slots.copy()
            ),
            Faculty(
                id="fac_ananya",
                name="Dr. Ananya Sen",
                employee_id="EMP1004",
                department_id="dept_ece",
                email="dr.sen@vit.ac.in",
                subjects=["subj_dig_elec", "subj_elec_lab"],
                max_classes_per_day=4,
                max_classes_per_week=15,
                available_days=DAYS.copy(),
                available_slots=full_slots.copy()
            )
        ]

        # Subjects
        self.subjects = [
            Subject(
                id="subj_dsa",
                name="Data Structures & Algorithms",
                code="CSE1001",
                department_id="dept_cse",
                faculty_id="fac_rahul",
                sessions_per_week=3,
                session_duration_hours=1,
                room_requirement="Lecture Room",
                lab_required=False,
                student_group_ids=["sg_cse_4a", "sg_cse_4b"]
            ),
            Subject(
                id="subj_dsa_lab",
                name="Data Structures Lab",
                code="CSE1001L",
                department_id="dept_cse",
                faculty_id="fac_vikram",
                sessions_per_week=1,
                session_duration_hours=2,
                room_requirement="Computer Lab",
                lab_required=True,
                student_group_ids=["sg_cse_4a"]
            ),
            Subject(
                id="subj_ai",
                name="Artificial Intelligence",
                code="CSE3002",
                department_id="dept_cse",
                faculty_id="fac_rahul",
                sessions_per_week=3,
                session_duration_hours=1,
                room_requirement="Lecture Room",
                lab_required=False,
                student_group_ids=["sg_cse_4a"]
            ),
            Subject(
                id="subj_dbms",
                name="Database Management Systems",
                code="CSE2001",
                department_id="dept_cse",
                faculty_id="fac_priya",
                sessions_per_week=3,
                session_duration_hours=1,
                room_requirement="Lecture Room",
                lab_required=False,
                student_group_ids=["sg_cse_4a", "sg_cse_4b"]
            ),
            Subject(
                id="subj_dbms_lab",
                name="DBMS Laboratory",
                code="CSE2001L",
                department_id="dept_cse",
                faculty_id="fac_priya",
                sessions_per_week=1,
                session_duration_hours=2,
                room_requirement="Computer Lab",
                lab_required=True,
                student_group_ids=["sg_cse_4a"]
            ),
            Subject(
                id="subj_se",
                name="Software Engineering",
                code="CSE2004",
                department_id="dept_cse",
                faculty_id="fac_vikram",
                sessions_per_week=2,
                session_duration_hours=1,
                room_requirement="Lecture Room",
                lab_required=False,
                student_group_ids=["sg_cse_4a"]
            ),
            Subject(
                id="subj_dig_elec",
                name="Digital Electronics",
                code="ECE1002",
                department_id="dept_ece",
                faculty_id="fac_ananya",
                sessions_per_week=3,
                session_duration_hours=1,
                room_requirement="Lecture Room",
                lab_required=False,
                student_group_ids=["sg_ece_4a"]
            ),
            Subject(
                id="subj_elec_lab",
                name="Electronics Circuits Lab",
                code="ECE1002L",
                department_id="dept_ece",
                faculty_id="fac_ananya",
                sessions_per_week=1,
                session_duration_hours=2,
                room_requirement="Electronics Lab",
                lab_required=True,
                student_group_ids=["sg_ece_4a"]
            )
        ]

        # Users (Demo Accounts)
        self.users = [
            User(
                id="user_admin",
                name="Dr. S. K. Roy (HOD Admin)",
                email="admin@vit.ac.in",
                role="ADMIN",
                department_id="dept_cse",
                avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
            ),
            User(
                id="user_faculty_rahul",
                name="Dr. Rahul Sharma",
                email="dr.sharma@vit.ac.in",
                role="FACULTY",
                department_id="dept_cse",
                faculty_id="fac_rahul",
                avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
            ),
            User(
                id="user_faculty_priya",
                name="Dr. Priya Patel",
                email="dr.patel@vit.ac.in",
                role="FACULTY",
                department_id="dept_cse",
                faculty_id="fac_priya",
                avatar="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"
            ),
            User(
                id="user_student_aaryan",
                name="Aaryan Verma",
                email="student.aaryan@vit.ac.in",
                role="STUDENT",
                department_id="dept_cse",
                student_group_id="sg_cse_4a",
                avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
            )
        ]

        # Initial Notifications
        self.notifications = [
            Notification(
                id="notif_1",
                user_id="user_student_aaryan",
                target_role="STUDENT",
                title="VIT Timetable Published",
                message="B.Tech CSE Semester 4 Section A Official VIT Slot Timetable for Spring 2026 has been published.",
                type="info",
                timestamp="2026-09-02 09:00:00",
                read=False
            ),
            Notification(
                id="notif_2",
                user_id="user_faculty_rahul",
                target_role="FACULTY",
                title="Room Allocation Notice",
                message="Artificial Intelligence lecture on A11 slot (Mon 08:30 AM) assigned to SJT 301.",
                type="room_change",
                timestamp="2026-09-02 10:15:00",
                read=False
            )
        ]

        # VIT Timetable Seed Slots matching exact uploaded image slot codes
        sample_slots = [
            # Monday (A11, B11, C11, A21, A14, B21, C21)
            TimetableSlot(id="ts_1", day="Monday", time_slot="08:30", subject_id="subj_dsa", subject_name="Data Structures & Algorithms", subject_code="CSE1001 [A11]", faculty_id="fac_rahul", faculty_name="Dr. Rahul Sharma", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_2", day="Monday", time_slot="10:05", subject_id="subj_ai", subject_name="Artificial Intelligence", subject_code="CSE3002 [B11]", faculty_id="fac_rahul", faculty_name="Dr. Rahul Sharma", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_3", day="Monday", time_slot="11:40", subject_id="subj_dbms", subject_name="Database Management Systems", subject_code="CSE2001 [C11]", faculty_id="fac_priya", faculty_name="Dr. Priya Patel", classroom_id="room_c302", classroom_name="SJT 302", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_4", day="Monday", time_slot="13:15", subject_id="subj_dsa_lab", subject_name="Data Structures Lab", subject_code="CSE1001L [A21]", faculty_id="fac_vikram", faculty_name="Prof. Vikram Singh", classroom_id="room_lab1", classroom_name="SJT Comp Lab 1", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A", is_lab=True),
            TimetableSlot(id="ts_5", day="Monday", time_slot="14:50", subject_id="subj_dsa_lab", subject_name="Data Structures Lab", subject_code="CSE1001L [A14]", faculty_id="fac_vikram", faculty_name="Prof. Vikram Singh", classroom_id="room_lab1", classroom_name="SJT Comp Lab 1", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A", is_lab=True),

            # Tuesday (D11, E11, F11, D21, E14, E21, F21)
            TimetableSlot(id="ts_6", day="Tuesday", time_slot="08:30", subject_id="subj_dbms", subject_name="Database Management Systems", subject_code="CSE2001 [D11]", faculty_id="fac_priya", faculty_name="Dr. Priya Patel", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_7", day="Tuesday", time_slot="10:05", subject_id="subj_se", subject_name="Software Engineering", subject_code="CSE2004 [E11]", faculty_id="fac_vikram", faculty_name="Prof. Vikram Singh", classroom_id="room_c302", classroom_name="SJT 302", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_8", day="Tuesday", time_slot="11:40", subject_id="subj_ai", subject_name="Artificial Intelligence", subject_code="CSE3002 [F11]", faculty_id="fac_rahul", faculty_name="Dr. Rahul Sharma", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_9", day="Tuesday", time_slot="13:15", subject_id="subj_dbms_lab", subject_name="DBMS Laboratory", subject_code="CSE2001L [D21]", faculty_id="fac_priya", faculty_name="Dr. Priya Patel", classroom_id="room_lab1", classroom_name="SJT Comp Lab 1", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A", is_lab=True),

            # Wednesday (A12, B12, C12, A22, B14, B22, A24)
            TimetableSlot(id="ts_10", day="Wednesday", time_slot="08:30", subject_id="subj_dsa", subject_name="Data Structures & Algorithms", subject_code="CSE1001 [A12]", faculty_id="fac_rahul", faculty_name="Dr. Rahul Sharma", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_11", day="Wednesday", time_slot="10:05", subject_id="subj_dbms", subject_name="Database Management Systems", subject_code="CSE2001 [B12]", faculty_id="fac_priya", faculty_name="Dr. Priya Patel", classroom_id="room_c302", classroom_name="SJT 302", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_12", day="Wednesday", time_slot="11:40", subject_id="subj_se", subject_name="Software Engineering", subject_code="CSE2004 [C12]", faculty_id="fac_vikram", faculty_name="Prof. Vikram Singh", classroom_id="room_c302", classroom_name="SJT 302", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),

            # Thursday (D12, E12, F12, D22, F14, E22, F22)
            TimetableSlot(id="ts_13", day="Thursday", time_slot="08:30", subject_id="subj_ai", subject_name="Artificial Intelligence", subject_code="CSE3002 [D12]", faculty_id="fac_rahul", faculty_name="Dr. Rahul Sharma", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            TimetableSlot(id="ts_14", day="Thursday", time_slot="10:05", subject_id="subj_dsa", subject_name="Data Structures & Algorithms", subject_code="CSE1001 [E12]", faculty_id="fac_rahul", faculty_name="Dr. Rahul Sharma", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),

            # Friday (A13, B13, C13, A23, C14, B23, B24)
            TimetableSlot(id="ts_15", day="Friday", time_slot="10:05", subject_id="subj_se", subject_name="Software Engineering", subject_code="CSE2004 [B13]", faculty_id="fac_vikram", faculty_name="Prof. Vikram Singh", classroom_id="room_c204", classroom_name="TT 204", student_group_id="sg_cse_4a", student_group_name="B.Tech CSE Sem 4 Sec A"),
            
            # Saturday (D13, E13, F13, D23, D14, D24, E23)
            TimetableSlot(id="ts_16", day="Saturday", time_slot="08:30", subject_id="subj_dsa", subject_name="Data Structures & Algorithms", subject_code="CSE1001 [D13]", faculty_id="fac_rahul", faculty_name="Dr. Rahul Sharma", classroom_id="room_c301", classroom_name="SJT 301", student_group_id="sg_cse_4b", student_group_name="B.Tech CSE Sem 4 Sec B")
        ]

        # Compute authentic initial metrics using MetricsCalculator
        from app.engine.metrics_calculator import MetricsCalculator
        fac_map = {f.id: f for f in self.faculty}
        cr_map = {c.id: c for c in self.classrooms}
        sg_map = {sg.id: sg for sg in self.student_groups}
        subj_map = {s.id: s for s in self.subjects}

        metrics_calc = MetricsCalculator(sample_slots, fac_map, cr_map, sg_map, subj_map)
        calc_res = metrics_calc.compute()
        real_score = calc_res["overall_optimization_score"]
        real_metrics = {
            "total_classes_scheduled": calc_res["total_slots"],
            "faculty_conflicts": calc_res["conflicts_breakdown"]["faculty_conflicts"],
            "room_conflicts": calc_res["conflicts_breakdown"]["room_conflicts"],
            "student_conflicts": calc_res["conflicts_breakdown"]["student_group_conflicts"],
            "lab_requirements_met": f"{calc_res['lab_compliance']['compliance_pct']}%",
            "workload_balance": f"{calc_res['workload_balance']['balance_percentage']}%",
            "room_utilization": f"{calc_res['room_utilization']['overall_utilization_pct']}%",
        }

        self.timetables = [
            Timetable(
                id="tt_opt_a",
                name="VIT Master Schedule (Balanced Workload & Slots)",
                option_type="Option A",
                department_id="dept_cse",
                semester=4,
                academic_year="2025-2026",
                status="Published",
                optimization_score=real_score,
                constraint_metrics=real_metrics,
                slots=sample_slots
            ),
            Timetable(
                id="tt_opt_b",
                name="VIT Option B (Lab First Priority)",
                option_type="Option B",
                department_id="dept_cse",
                semester=4,
                academic_year="2025-2026",
                status="Draft",
                optimization_score=round(max(60.0, real_score - 3.5), 1),
                constraint_metrics={
                    **real_metrics,
                    "workload_balance": f"{max(0.0, calc_res['workload_balance']['balance_percentage'] - 5.0):.1f}%",
                },
                slots=sample_slots
            )
        ]


db = Database()
