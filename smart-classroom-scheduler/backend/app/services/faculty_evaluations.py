import os
import csv
import re
import difflib
from typing import Dict, List, Optional, Any, Tuple

class FacultyEvaluationService:
    def __init__(self):
        self.records: List[Dict[str, Any]] = []
        self.normalized_map: Dict[str, Dict[str, Any]] = {}
        self.names_list: List[str] = []
        self._load_csv()

    def _get_csv_path(self) -> str:
        # Search common paths
        possible_paths = [
            # FIXED/ADDED: this is the actual correct relative path — backend/app/services/../../data
            # resolves to backend/data. None of the paths below it ever pointed at the real file
            # location regardless of the process's working directory, so the CSV silently failed
            # to load and every faculty came back "Evaluation not found".
            os.path.join(os.path.dirname(__file__), "..", "..", "data", "faculty_evaluations.csv"),
            os.path.join(os.path.dirname(__file__), "..", "data", "faculty_evaluations.csv"),
            os.path.join(os.path.dirname(__file__), "..", "..", "faculty_evaluations.csv"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "faculty_evaluations.csv"),
            os.path.abspath("faculty_evaluations.csv"),
            os.path.abspath("backend/faculty_evaluations.csv"),
            os.path.abspath("backend/data/faculty_evaluations.csv")
        ]
        for p in possible_paths:
            if os.path.exists(p):
                return p
        # Fallback default
        return os.path.join(os.path.dirname(__file__), "..", "data", "faculty_evaluations.csv")

    def normalize_name(self, name: str) -> str:
        """Normalize faculty name for robust matching (removes titles, punctuation, duplicate spaces)"""
        if not name:
            return ""
        # Lowercase
        s = name.lower()
        # Remove common academic titles
        s = re.sub(r'\b(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?|sir)\b', '', s)
        # Remove text in parentheses like (DSA), (IWP,DSA)
        s = re.sub(r'\(.*?\)', '', s)
        # Remove non-alphanumeric except spaces
        s = re.sub(r'[^a-z0-9\s]', ' ', s)
        # Normalize multiple spaces
        s = re.sub(r'\s+', ' ', s).strip()
        return s

    def _parse_float(self, val: Any) -> Optional[float]:
        if val is None:
            return None
        s = str(val).strip()
        if not s or s.lower() in ["nan", "null", "none", "-", ""]:
            return None
        # Handle formats like "32/50"
        if "/" in s:
            try:
                parts = s.split("/")
                return round((float(parts[0]) / float(parts[1])) * 5.0, 2)
            except Exception:
                return None
        try:
            return float(s)
        except ValueError:
            return None

    def _load_csv(self):
        csv_path = self._get_csv_path()
        if not os.path.exists(csv_path):
            print(f"[FacultyEvaluationService] Warning: CSV not found at {csv_path}")
            return

        self.records.clear()
        self.normalized_map.clear()
        self.names_list.clear()

        try:
            with open(csv_path, mode='r', encoding='utf-8-sig', errors='ignore') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    raw_name = (row.get('Name') or '').strip()
                    # Skip empty separator rows
                    if not raw_name or set(raw_name) == {','}:
                        continue
                    
                    overall_score = self._parse_float(row.get('Overall'))
                    record = {
                        "name": raw_name,
                        "teaching": self._parse_float(row.get('Teaching')),
                        "evaluation": self._parse_float(row.get('Evaluation')),
                        "behaviour": self._parse_float(row.get('Behaviour')),
                        "internals": self._parse_float(row.get('Internals')),
                        "average": row.get('Average', '').strip(),
                        "overall": overall_score,
                        "remarks": (row.get('Unnamed: 7') or '').strip()
                    }
                    self.records.append(record)
                    norm = self.normalize_name(raw_name)
                    if norm:
                        self.normalized_map[norm] = record
                        self.names_list.append(raw_name)
            print(f"[FacultyEvaluationService] Loaded {len(self.records)} faculty records from {csv_path}")
        except Exception as e:
            print(f"[FacultyEvaluationService] Error loading CSV: {e}")

    def get_all_faculty(self) -> List[Dict[str, Any]]:
        return self.records

    def search_faculty(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        if not query:
            return self.records[:limit]
        norm_query = self.normalize_name(query)
        matches = []
        for r in self.records:
            norm_name = self.normalize_name(r['name'])
            if norm_query in norm_name or norm_name in norm_query:
                matches.append(r)
            else:
                ratio = difflib.SequenceMatcher(None, norm_query, norm_name).ratio()
                if ratio >= 0.6:
                    matches.append(r)
            if len(matches) >= limit:
                break
        return matches

    def match_faculty(self, extracted_name: str) -> Dict[str, Any]:
        """
        Matches extracted OCR name against faculty_evaluations.csv.
        Returns match status, confidence, and CSV record.
        """
        if not extracted_name or not extracted_name.strip():
            return {
                "matched": False,
                "faculty_name": extracted_name,
                "status": "Evaluation not found",
                "overall": None,
                "confidence": 0.0,
                "record": None
            }

        norm_query = self.normalize_name(extracted_name)

        # 1. Exact normalized match
        if norm_query in self.normalized_map:
            rec = self.normalized_map[norm_query]
            overall = rec.get('overall')
            status_text = "Verified Match" if overall is not None else "Overall score unavailable"
            return {
                "matched": True,
                "faculty_name": rec['name'],
                "status": status_text,
                "overall": overall,
                "confidence": 1.0,
                "record": rec,
                "match_type": "exact"
            }

        # 2. Fuzzy matching across all normalized names
        scored_matches: List[Tuple[float, Dict[str, Any]]] = []
        query_words = set(norm_query.split())

        for norm_name, rec in self.normalized_map.items():
            # Character sequence similarity
            char_ratio = difflib.SequenceMatcher(None, norm_query, norm_name).ratio()
            
            # Word token overlap (e.g. "Abhishek Kumar" vs "Abhishek Kmar")
            name_words = set(norm_name.split())
            common_words = query_words.intersection(name_words)
            token_ratio = len(common_words) / max(len(query_words), len(name_words)) if name_words else 0.0
            
            # Combined score
            final_ratio = max(char_ratio, (char_ratio * 0.6) + (token_ratio * 0.4))
            
            if final_ratio >= 0.70:
                scored_matches.append((final_ratio, rec))

        scored_matches.sort(key=lambda x: x[0], reverse=True)

        if not scored_matches:
            return {
                "matched": False,
                "faculty_name": extracted_name,
                "status": "Evaluation not found",
                "overall": None,
                "confidence": 0.0,
                "record": None
            }

        top_score, top_rec = scored_matches[0]

        # Check for ambiguity (multiple faculty with very close scores)
        if len(scored_matches) > 1:
            second_score, second_rec = scored_matches[1]
            if (top_score - second_score) < 0.06 and top_score < 0.95:
                # Ambiguous match! Do not arbitrarily guess
                return {
                    "matched": False,
                    "uncertain": True,
                    "faculty_name": extracted_name,
                    "status": "Faculty match uncertain",
                    "overall": None,
                    "confidence": round(top_score, 2),
                    "candidate_names": [top_rec['name'], second_rec['name']],
                    "record": None
                }

        # Confident fuzzy match (>= 0.78)
        if top_score >= 0.78:
            overall = top_rec.get('overall')
            status_text = "Verified Match" if overall is not None else "Overall score unavailable"
            return {
                "matched": True,
                "faculty_name": top_rec['name'],
                "status": status_text,
                "overall": overall,
                "confidence": round(top_score, 2),
                "record": top_rec,
                "match_type": "fuzzy"
            }

        # Below confidence threshold
        return {
            "matched": False,
            "faculty_name": extracted_name,
            "status": "Evaluation not found",
            "overall": None,
            "confidence": round(top_score, 2),
            "record": None
        }

# Global singleton service
faculty_service = FacultyEvaluationService()
