from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class UserLogin(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None

class User(BaseModel):
    id: str
    name: str
    email: str
    role: str # "ADMIN", "FACULTY", "STUDENT"
    department_id: Optional[str] = None
    faculty_id: Optional[str] = None
    student_group_id: Optional[str] = None
    avatar: Optional[str] = None

class Department(BaseModel):
    id: str
    name: str
    code: str
    head_of_department: Optional[str] = None

class StudentGroup(BaseModel):
    id: str
    name: str # e.g. B.Tech CSE Sem 4 Sec A
    department_id: str
    course: str # B.Tech, M.Tech
    semester: int
    section: str # A, B
    student_count: int

class Subject(BaseModel):
    id: str
    name: str
    code: str
    department_id: str
    faculty_id: str
    sessions_per_week: int
    session_duration_hours: int # 1 or 2
    room_requirement: str # "Lecture Room", "Computer Lab", "Electronics Lab", "Seminar Hall"
    lab_required: bool
    student_group_ids: List[str]

class Classroom(BaseModel):
    id: str
    name: str
    building: str
    capacity: int
    room_type: str # "Lecture Room", "Computer Lab", "Electronics Lab", "Seminar Hall"
    status: str # "Available", "Occupied", "Maintenance"

class FacultyAvailability(BaseModel):
    faculty_id: str
    available_days: List[str] # ["Monday", "Tuesday", ...]
    available_slots: Dict[str, List[str]] # e.g. {"Monday": ["09:00", "10:00", ...]}

class Faculty(BaseModel):
    id: str
    name: str
    employee_id: str
    department_id: str
    email: str
    subjects: List[str] # Subject IDs
    max_classes_per_day: int = 4
    max_classes_per_week: int = 16
    available_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    available_slots: Dict[str, List[str]] = {}

class TimetableSlot(BaseModel):
    id: str
    day: str # Monday, Tuesday, Wednesday, Thursday, Friday
    time_slot: str # "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"
    subject_id: str
    subject_name: str
    subject_code: str
    faculty_id: str
    faculty_name: str
    classroom_id: str
    classroom_name: str
    student_group_id: str
    student_group_name: str
    is_lab: bool = False

class Timetable(BaseModel):
    id: str
    name: str
    option_type: str # "Option A", "Option B", "Option C"
    department_id: str
    semester: int
    academic_year: str
    status: str # "Draft", "Pending Approval", "Approved", "Published"
    optimization_score: float # e.g. 96.0
    constraint_metrics: Dict[str, Any] = {}
    slots: List[TimetableSlot] = []

class RescheduleRequest(BaseModel):
    id: str
    faculty_id: str
    faculty_name: str
    reason: str
    date: str
    affected_slots: List[Dict[str, Any]]
    suggested_replacements: List[Dict[str, Any]]
    status: str # "Pending", "Approved", "Rejected"

class Notification(BaseModel):
    id: str
    user_id: Optional[str] = None # None means broadcast
    target_role: Optional[str] = None # "STUDENT", "FACULTY", "ALL"
    title: str
    message: str
    type: str # "reschedule", "room_change", "info", "warning"
    timestamp: str
    read: bool = False

class AIQueryRequest(BaseModel):
    user_role: str
    user_id: str
    query: str
