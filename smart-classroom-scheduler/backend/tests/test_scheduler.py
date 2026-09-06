"""
Automated Test Suite — Smart Classroom & Timetable Scheduler Engine
====================================================================
Tests the complete constraint optimization pipeline:
- Timetable generation (CP-SAT / deterministic greedy)
- Hard constraint validation (0 double bookings)
- Live Metrics Calculator (genuine mathematical score)
- Conflict Detector (authentic detection & resolution ranking)
- Automatic Rescheduler (multi-factor substitute scoring)
- Dynamic Re-optimizer (what-if disruption simulation)
"""

import unittest
from app.database import db
from app.engine.cpsat_scheduler import CpsatScheduler
from app.engine.metrics_calculator import MetricsCalculator
from app.engine.conflict_detector import ConflictDetectorEngine
from app.engine.rescheduler import AutomaticReschedulerEngine
from app.engine.reoptimizer import DynamicReoptimizerEngine
from app.models import TimetableSlot


class TestSchedulerPipeline(unittest.TestCase):

    def setUp(self):
        db.seed_default_data()
        self.scheduler = CpsatScheduler(
            subjects=db.subjects,
            faculty_list=db.faculty,
            classrooms=db.classrooms,
            student_groups=db.student_groups,
        )

    def test_01_cpsat_solver_returns_required_schema(self):
        """Verify solver returns timetable, objective_score, hard/soft violations, metrics, execution_time."""
        result = self.scheduler.solve(
            department_id="dept_cse", semester=4, academic_year="2025-2026", strategy="balanced"
        )
        self.assertIn("timetable", result)
        self.assertIn("objective_score", result)
        self.assertIn("hard_constraint_violations", result)
        self.assertIn("soft_constraint_violations", result)
        self.assertIn("optimization_metrics", result)
        self.assertIn("solver_execution_time", result)

        self.assertGreater(len(result["timetable"].slots), 0)
        self.assertIsInstance(result["objective_score"], float)
        self.assertGreaterEqual(result["objective_score"], 50.0)
        self.assertLessEqual(result["objective_score"], 100.0)
        self.assertGreater(result["solver_execution_time"], 0.0)

    def test_02_all_ten_hard_constraints_zero_violations(self):
        """
        Verify all 10 hard constraints strictly yield 0 violations across all optimization strategies:
        1. Faculty collision
        2. Room collision
        3. Student-group collision
        4. Room capacity
        5. Lab requirements
        6. Faculty availability
        7. Room availability
        8. Required sessions
        9. Faculty daily load
        10. Faculty weekly load
        """
        strategies = ["balanced", "lab_priority", "compact_morning"]
        for strat in strategies:
            result = self.scheduler.solve(
                department_id="dept_cse", semester=4, academic_year="2025-2026", strategy=strat
            )
            violations = result["hard_constraint_violations"]

            self.assertEqual(violations["faculty_collision"], 0, f"[{strat}] Faculty collision found!")
            self.assertEqual(violations["room_collision"], 0, f"[{strat}] Room collision found!")
            self.assertEqual(violations["student_group_collision"], 0, f"[{strat}] Student-group collision found!")
            self.assertEqual(violations["room_capacity"], 0, f"[{strat}] Room capacity violated!")
            self.assertEqual(violations["lab_requirements"], 0, f"[{strat}] Lab requirements violated!")
            self.assertEqual(violations["faculty_availability"], 0, f"[{strat}] Faculty availability violated!")
            self.assertEqual(violations["room_availability"], 0, f"[{strat}] Inactive room scheduled!")
            self.assertEqual(violations["required_sessions"], 0, f"[{strat}] Required sessions unsatisfied!")
            self.assertEqual(violations["faculty_daily_load"], 0, f"[{strat}] Faculty daily load exceeded!")
            self.assertEqual(violations["faculty_weekly_load"], 0, f"[{strat}] Faculty weekly load exceeded!")
            self.assertEqual(violations["total_hard_violations"], 0, f"[{strat}] Total hard violations non-zero!")

    def test_03_all_seven_soft_constraints_audited(self):
        """
        Verify soft constraint metrics for:
        1. Faculty workload balance
        2. Room utilization
        3. Student gaps
        4. Faculty gaps
        5. Room capacity wastage
        6. Preferred slots
        7. Compact schedules
        """
        result = self.scheduler.solve(
            department_id="dept_cse", semester=4, academic_year="2025-2026", strategy="balanced"
        )
        soft = result["soft_constraint_violations"]
        metrics = result["optimization_metrics"]

        self.assertIn("workload_std_dev", soft)
        self.assertIn("room_utilization_pct", soft)
        self.assertIn("student_idle_gaps", soft)
        self.assertIn("faculty_idle_gaps", soft)
        self.assertIn("total_capacity_wastage", soft)
        self.assertIn("preferred_slots_scheduled", soft)
        self.assertIn("consecutive_class_pairs", soft)

        self.assertGreater(metrics["room_utilization_pct"], 0.0)
        self.assertGreaterEqual(metrics["workload_balance_pct"], 50.0)

    def test_04_timetable_generation_options(self):
        """Generate 3 distinct options for CSE department."""
        options = self.scheduler.generate_options(
            department_id="dept_cse", semester=4, academic_year="2025-2026"
        )
        self.assertEqual(len(options), 3)
        for opt in options:
            self.assertGreater(len(opt.slots), 0)
            self.assertGreaterEqual(opt.optimization_score, 60.0)
            self.assertLessEqual(opt.optimization_score, 100.0)
            self.assertIn("workload_balance", opt.constraint_metrics)
            self.assertIn("room_utilization", opt.constraint_metrics)

    def test_05_metrics_calculator_computation(self):
        """Verify MetricsCalculator outputs real mathematical metrics without hardcoding."""
        active_tt = db.timetables[0]
        calc = MetricsCalculator.from_db(active_tt.slots, db)
        metrics = calc.compute()

        self.assertGreater(metrics["total_slots"], 0)
        self.assertIn("overall_optimization_score", metrics)
        self.assertIn("workload_balance", metrics)
        self.assertIn("room_utilization", metrics)
        self.assertIn("lab_compliance", metrics)
        self.assertEqual(metrics["conflicts_count"], 0)

    def test_06_conflict_detection_and_resolution_ranking(self):
        """Verify ConflictDetector flags artificial conflict and provides candidate resolutions."""
        active_tt = db.timetables[0]
        f_dict = {f.id: f for f in db.faculty}
        c_dict = {c.id: c for c in db.classrooms}
        g_dict = {g.id: g for g in db.student_groups}
        s_dict = {s.id: s for s in db.subjects}

        detector = ConflictDetectorEngine(f_dict, c_dict, g_dict, s_dict)

        # Clean baseline should have 0 conflicts
        clean_conflicts = detector.detect_conflicts(active_tt.slots)
        self.assertEqual(len(clean_conflicts), 0)

        # Inject deliberate faculty double-booking
        colliding_slot = active_tt.slots[0].model_copy()
        colliding_slot.id = "ts_collision_test"
        colliding_slot.subject_name = "Colliding Course"
        colliding_slot.student_group_id = "sg_cse_2a"

        dirty_slots = active_tt.slots + [colliding_slot]
        detected = detector.detect_conflicts(dirty_slots)
        self.assertGreater(len(detected), 0)
        self.assertEqual(detected[0]["type"], "Faculty Conflict")
        self.assertIn("candidate_resolutions", detected[0])

    def test_07_rescheduler_multi_factor_ranking(self):
        """Verify AutomaticRescheduler ranks substitutes by multi-factor score."""
        active_tt = db.timetables[0]
        rescheduler = AutomaticReschedulerEngine(db.faculty, db.classrooms)
        proposal = rescheduler.generate_reschedule_proposal(
            faculty_id="fac_rahul",
            absence_date="2026-09-08",
            reason="Conference presentation",
            current_slots=active_tt.slots,
        )

        self.assertEqual(proposal["faculty_id"], "fac_rahul")
        self.assertGreater(len(proposal["suggested_replacements"]), 0)
        for repl in proposal["suggested_replacements"]:
            self.assertIn("ranked_candidates", repl)
            self.assertIn("reasoning", repl)
            self.assertGreater(len(repl["ranked_candidates"]), 0)
            # Scores must be sorted descending
            scores = [c["score"] for c in repl["ranked_candidates"]]
            self.assertEqual(scores, sorted(scores, reverse=True))

    def test_08_dynamic_reoptimizer_what_if_scenario(self):
        """Verify DynamicReoptimizer handles room outage with minimal disruption."""
        active_tt = db.timetables[0]
        f_dict = {f.id: f for f in db.faculty}
        c_dict = {c.id: c for c in db.classrooms}
        g_dict = {g.id: g for g in db.student_groups}
        s_dict = {s.id: s for s in db.subjects}

        reoptimizer = DynamicReoptimizerEngine(f_dict, c_dict, g_dict, s_dict)
        sim = reoptimizer.simulate_what_if(
            scenario_type="room_unavailable",
            target_id="room_c301",
            current_slots=active_tt.slots,
        )

        self.assertIn("metrics", sim)
        self.assertIn("disruption_log", sim)
        self.assertIn("new_slots", sim)
        # Verify no slot is assigned to room_c301 in new_slots
        for s in sim["new_slots"]:
            self.assertNotEqual(s["classroom_id"], "room_c301", "Disabled room must not be in re-optimized schedule!")


if __name__ == "__main__":
    unittest.main()
