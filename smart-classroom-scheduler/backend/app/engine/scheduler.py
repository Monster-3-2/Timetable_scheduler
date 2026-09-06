import random
import uuid
from typing import List, Dict, Any, Tuple
from app.models import Timetable, TimetableSlot, Subject, Faculty, Classroom, StudentGroup

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
TIME_SLOTS = ["08:30", "10:05", "11:40", "13:15", "14:50", "16:25", "18:00"]

VIT_SLOT_GRID = {
    "Monday":    {"08:30": "A11", "10:05": "B11", "11:40": "C11", "13:15": "A21", "14:50": "A14", "16:25": "B21", "18:00": "C21"},
    "Tuesday":   {"08:30": "D11", "10:05": "E11", "11:40": "F11", "13:15": "D21", "14:50": "E14", "16:25": "E21", "18:00": "F21"},
    "Wednesday": {"08:30": "A12", "10:05": "B12", "11:40": "C12", "13:15": "A22", "14:50": "B14", "16:25": "B22", "18:00": "A24"},
    "Thursday":  {"08:30": "D12", "10:05": "E12", "11:40": "F12", "13:15": "D22", "14:50": "F14", "16:25": "E22", "18:00": "F22"},
    "Friday":    {"08:30": "A13", "10:05": "B13", "11:40": "C13", "13:15": "A23", "14:50": "C14", "16:25": "B23", "18:00": "B24"},
    "Saturday":  {"08:30": "D13", "10:05": "E13", "11:40": "F13", "13:15": "D23", "14:50": "D14", "16:25": "D24", "18:00": "E23"}
}

from app.engine.cpsat_scheduler import CpsatScheduler, ORTOOLS_OK

class TimetableSchedulerEngine:
    def __init__(self, subjects: List[Subject], faculty_list: List[Faculty], classrooms: List[Classroom], student_groups: List[StudentGroup]):
        self._engine = CpsatScheduler(subjects, faculty_list, classrooms, student_groups)
        self.subjects = self._engine.subjects
        self.faculty = self._engine.faculty
        self.classrooms = self._engine.classrooms
        self.student_groups = self._engine.student_groups

    def generate_options(self, department_id: str, semester: int, academic_year: str) -> List[Timetable]:
        return self._engine.generate_options(department_id, semester, academic_year)

    def solve(self, department_id: str = "dept_cse", semester: int = 4, academic_year: str = "2025-2026", strategy: str = "balanced", weights: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        return self._engine.solve(department_id, semester, academic_year, strategy=strategy, weights=weights)
