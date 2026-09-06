from typing import List, Dict, Any, Optional
from app.services.faculty_evaluations import faculty_service
# ADDED: FFCS Smart Advisor — slot period detection, tie differentiation,
# timing-preference boost, campus-fit scoring, and persistent pick history.
from app.services.ffcs_advisor import (
    classify_slot_period,
    differentiate_tied_ratings,
    apply_preferred_period_boost,
    compute_campus_fit,
    save_selection_to_history,
)

class FacultyRecommendationEngine:
    def recommend_best_faculty(self, rows: List[Dict[str, Any]], preferred_period: Optional[str] = None, student_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Recommends the best faculty and top alternatives based on verified Overall score,
        filtering out 0-seat sections.
        """
        if not rows:
            return {
                "success": False,
                "message": "No faculty rows provided for recommendation.",
                "bestFaculty": None,
                "alternatives": [],
                "excluded": []
            }

        eligible_candidates = []
        excluded_zero_seats = []
        unverified_or_missing = []

        for r in rows:
            fac_name = r.get("facultyName", "").strip()
            subject = r.get("subject", "Course").strip()
            slot = r.get("slot", "A1").strip()
            
            try:
                seats = int(r.get("availableSeats", 0))
            except (ValueError, TypeError):
                seats = 0

            # Re-verify match against CSV
            match_res = faculty_service.match_faculty(fac_name)
            matched_rec = match_res.get("record")
            overall = match_res.get("overall")

            item = {
                "id": r.get("id"),
                "facultyName": match_res.get("faculty_name") or fac_name,
                "subject": subject,
                "slot": slot,
                "availableSeats": seats,
                "confidence": r.get("confidence", 0.9),
                "matched": match_res.get("matched", False),
                "overallScore": overall,
                "evaluationStatus": match_res.get("status", "Evaluation not found"),
                "teachingScore": matched_rec.get("teaching") if matched_rec else None,
                "evaluationScore": matched_rec.get("evaluation") if matched_rec else None,
                "behaviourScore": matched_rec.get("behaviour") if matched_rec else None,
                "internalsScore": matched_rec.get("internals") if matched_rec else None,
                "remarks": matched_rec.get("remarks") if matched_rec else ""
            }

            # Filter 1: Available Seats = 0
            if seats <= 0:
                item["exclusionReason"] = "Zero seats available (Registration closed/full)"
                excluded_zero_seats.append(item)
                continue

            # Filter 2: Verified match and valid Overall score
            if not match_res.get("matched") or overall is None:
                item["exclusionReason"] = match_res.get("status", "Evaluation not found")
                unverified_or_missing.append(item)
                continue

            eligible_candidates.append(item)

        # If no eligible candidates with seats > 0 and valid overall:
        if not eligible_candidates:
            reason = "No faculty with both available seats (>0) and verified Overall evaluation was found."
            if excluded_zero_seats:
                reason = "All matched faculty have 0 available seats. Please check the excluded sections below."
            return {
                "success": False,
                "message": reason,
                "bestFaculty": None,
                "alternatives": [],
                "excluded": excluded_zero_seats + unverified_or_missing
            }

        # Sorting: Primary = Overall score (descending), Secondary = Available seats (descending)
        # We group close scores (within 0.05) using secondary seats sort
        eligible_candidates.sort(
            key=lambda x: (
                round(x["overallScore"], 1),
                x["availableSeats"]
            ),
            reverse=True
        )

        # === ADDED: slot-period tagging, timing-preference boost, rating differentiation ===
        for _c in eligible_candidates:
            _c["period"] = classify_slot_period(_c.get("slot", ""))
        if preferred_period:
            eligible_candidates = apply_preferred_period_boost(eligible_candidates, preferred_period)
        eligible_candidates = differentiate_tied_ratings(eligible_candidates)
        # === END ADDED ===

        best = eligible_candidates[0]
        alternatives = eligible_candidates[1:4] # Top 2-3 alternatives

        # Build genuine "Why this faculty?" explanation from actual data
        reasons = [
            f"Highest verified Overall score ({best['overallScore']}/5.0) among all available options.",
            f"{best['availableSeats']} seats are currently available in slot {best['slot']}.",
            "Fully verified and matched against the official faculty evaluation dataset."
        ]
        if best.get("teachingScore"):
            reasons.append(f"Teaching rating: {best['teachingScore']}/5.0 • Behaviour: {best.get('behaviourScore', 'N/A')}/5.0.")
        if best.get("remarks"):
            reasons.append(f"Student feedback: \"{best['remarks']}\"")

        best["whyThisFaculty"] = reasons

        # === ADDED: campus-fit scoring (using saved history) + saving this pick for future suggestions ===
        best["campusFit"] = compute_campus_fit(best.get("slot", ""), student_id)
        for _alt in alternatives:
            _alt["campusFit"] = compute_campus_fit(_alt.get("slot", ""), student_id)
        if student_id:
            save_selection_to_history(student_id, best)
        # === END ADDED ===

        return {
            "success": True,
            "message": f"Successfully evaluated {len(rows)} timetable options.",
            "bestFaculty": best,
            "alternatives": alternatives,
            "excluded": excluded_zero_seats,
            "unverified": unverified_or_missing
        }

recommendation_engine = FacultyRecommendationEngine()
