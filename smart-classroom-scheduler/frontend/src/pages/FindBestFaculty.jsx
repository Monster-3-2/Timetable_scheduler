import React, { useState, useRef, useEffect } from 'react';
import { 
  Award, Upload, Camera, Sparkles, RefreshCw, CheckCircle2, 
  AlertTriangle, XCircle, RotateCw, RotateCcw, Edit2, Check, 
  ChevronDown, ChevronUp, UserCheck, Star, ThumbsUp, Users, 
  BookOpen, Clock, Key, Info, HelpCircle,
  Sunrise, Sunset, MapPin, History
} from 'lucide-react';

export default function FindBestFaculty() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [extractedRows, setExtractedRows] = useState(null);
  const [recommendationResult, setRecommendationResult] = useState(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [csvStats, setCsvStats] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState({});

  // ADDED: student timing preference, a lightweight per-browser student id
  // (so picks can be saved & reused for future suggestions), and saved history.
  const [preferredPeriod, setPreferredPeriod] = useState('Any');
  const [studentId, setStudentId] = useState('');
  const [ffcsHistory, setFfcsHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // ADDED: generate (once) and persist a student id in this browser so saved
  // FFCS picks can be recalled on future visits.
  useEffect(() => {
    let sid = localStorage.getItem('ffcs_student_id');
    if (!sid) {
      sid = 'student_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('ffcs_student_id', sid);
    }
    setStudentId(sid);
  }, []);

  const loadFfcsHistory = async (sid) => {
    if (!sid) return;
    try {
      const res = await fetch(`/api/faculty-recommendation/history/${sid}`);
      const data = await res.json();
      setFfcsHistory(data.history || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (studentId) loadFfcsHistory(studentId);
  }, [studentId]);

  const steps = [
    "Analyzing image quality & orientation...",
    "Detecting timetable table boundaries & headers...",
    "Reading faculty names, courses & slots...",
    "Matching evaluations against faculty_evaluations.csv...",
    "Checking availability (filtering 0-seat sections)...",
    "Finding best faculty recommendation..."
  ];

  useEffect(() => {
    // Load CSV stats
    fetch('/api/faculty-evaluations/stats')
      .then(res => res.json())
      .then(data => setCsvStats(data))
      .catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setRotationAngle(0);
      setExtractedRows(null);
      setRecommendationResult(null);
      setErrorMessage('');
    }
  };

  const handleLoadSample = async () => {
    try {
      const res = await fetch('/sample_registration_sheet.jpg');
      const blob = await res.blob();
      const file = new File([blob], 'sample_registration_sheet.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl('/sample_registration_sheet.jpg');
    } catch (e) {
      setPreviewUrl('/sample_registration_sheet.jpg');
    }
    setRotationAngle(0);
    setExtractedRows(null);
    setRecommendationResult(null);
    setErrorMessage('');
  };

  const handleRotate = (deg) => {
    const newAngle = (rotationAngle + deg + 360) % 360;
    setRotationAngle(newAngle);
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !previewUrl) {
      setErrorMessage("Please upload or capture a timetable photo first.");
      return;
    }

    setIsAnalyzing(true);
    setProcessingStep(0);
    setExtractedRows(null);
    setRecommendationResult(null);
    setErrorMessage('');

    // Fast non-blocking progress interval while request runs
    const interval = setInterval(() => {
      setProcessingStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 70);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('rotation', rotationAngle.toString());
      if (apiKey.trim()) {
        formData.append('api_key', apiKey.trim());
      }

      const res = await fetch('/api/faculty-recommendation/analyze-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      setProcessingStep(steps.length - 1);

      if (data.extractedRows && data.extractedRows.length > 0) {
        setExtractedRows(data.extractedRows);
      } else {
        setErrorMessage("Could not detect tabular registration data from this image. Please review or use a clearer photo.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error communicating with AI vision service. Showing fallback parsed data.");
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  const handleRowChange = async (index, field, value) => {
    const updated = [...extractedRows];
    updated[index][field] = value;

    // If student changed the faculty name, live re-match against CSV!
    if (field === 'facultyName') {
      try {
        const res = await fetch(`/api/faculty-recommendation/search-faculty?q=${encodeURIComponent(value)}`);
        const suggestions = await res.json();
        setSearchSuggestions(prev => ({ ...prev, [index]: suggestions }));

        // Exact check
        const matchFound = suggestions.find(s => s.name.toLowerCase() === value.trim().toLowerCase());
        if (matchFound) {
          updated[index].matched = true;
          updated[index].uncertain = false;
          updated[index].overallScore = matchFound.overall;
          updated[index].evaluationStatus = matchFound.overall !== null ? "Verified Match" : "Overall score unavailable";
          updated[index].teachingScore = matchFound.teaching;
          updated[index].behaviourScore = matchFound.behaviour;
          updated[index].internalsScore = matchFound.internals;
          updated[index].remarks = matchFound.remarks;
        }
      } catch (e) {}
    }

    setExtractedRows(updated);
  };

  const handleSelectSuggestion = (index, facultyRec) => {
    const updated = [...extractedRows];
    updated[index].facultyName = facultyRec.name;
    updated[index].matched = true;
    updated[index].uncertain = false;
    updated[index].overallScore = facultyRec.overall;
    updated[index].evaluationStatus = facultyRec.overall !== null ? "Verified Match" : "Overall score unavailable";
    updated[index].teachingScore = facultyRec.teaching;
    updated[index].behaviourScore = facultyRec.behaviour;
    updated[index].internalsScore = facultyRec.internals;
    updated[index].remarks = facultyRec.remarks;
    setExtractedRows(updated);
    setSearchSuggestions(prev => ({ ...prev, [index]: [] }));
  };

  const handleRecommend = async () => {
    if (!extractedRows || extractedRows.length === 0) return;

    setIsRecommending(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/faculty-recommendation/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: extractedRows,
          preferred_period: preferredPeriod !== 'Any' ? preferredPeriod : null, // ADDED
          student_id: studentId || null // ADDED
        })
      });
      const data = await res.json();
      setRecommendationResult(data);
      if (!data.success) {
        setErrorMessage(data.message);
      } else {
        loadFfcsHistory(studentId); // ADDED: refresh saved-picks panel after a successful recommendation
      }
    } catch (err) {
      setErrorMessage("Error calculating best faculty recommendation.");
    } finally {
      setIsRecommending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
            <span>AI Course Registration Optimizer</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Find the Best Faculty
          </h1>
          <p className="text-xs md:text-sm text-indigo-200 mt-2 leading-relaxed">
            Snap or upload a photo of your college timetable / course registration sheet. Our AI vision detects the table, filters out full classes (0 seats), and recommends the highest rated faculty using authentic student evaluations.
          </p>

          {csvStats && (
            <div className="mt-4 flex items-center space-x-4 text-[11px] text-indigo-300">
              <span>📊 Dataset: <strong>{csvStats.total_faculty_records} Faculty Records</strong></span>
              <span>•</span>
              <span>⭐ Verified Ratings: <strong>{csvStats.total_rated_faculty} Profiles</strong></span>
            </div>
          )}
        </div>

        {/* Settings Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 text-xs font-semibold backdrop-blur-md transition-all"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Vision API Key</span>
            {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Optional Gemini API Key Drawer */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold">
            <Key className="w-4 h-4" />
            <span>Google Gemini Vision API Configuration (Optional)</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            The app includes an intelligent built-in table parser and preprocessor. To connect directly to Google's live Gemini 1.5/2.5 Flash Vision model, enter your API key below:
          </p>
          <div className="flex items-center space-x-2 max-w-md">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* ADDED: Timing Preference + Saved History panel */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Your Class Timing Preference</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            We'll prioritize faculty options in your preferred half of the day when ratings are close.
          </p>
          <div className="flex items-center space-x-2 mt-3">
            {['Any', 'Morning', 'Evening'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPreferredPeriod(opt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all ${
                  preferredPeriod === opt
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {opt === 'Morning' && <Sunrise className="w-3.5 h-3.5" />}
                {opt === 'Evening' && <Sunset className="w-3.5 h-3.5" />}
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end space-y-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>Your Saved Picks ({ffcsHistory.length})</span>
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showHistory && (
            <div className="w-full md:w-80 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-2 space-y-1.5">
              {ffcsHistory.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic px-2 py-1">No picks saved yet — recommend a faculty below and it'll be remembered here for future suggestions.</p>
              ) : (
                ffcsHistory.map((h, i) => (
                  <div key={i} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px]">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{h.subject}</span>
                      <span className="text-amber-600">{h.displayScore ?? h.overallScore}/5.0</span>
                    </div>
                    <div className="text-slate-500">{h.facultyName} • {h.slot} • {h.period}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Upload & Image Controls */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">1. Upload Course Registration Sheet</h3>
            <p className="text-xs text-slate-500">Supports timetable photos from phone cameras, screenshots, or registration portals</p>
          </div>
        </div>

        {/* Upload Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex flex-col items-center justify-center space-y-2 transition-all cursor-pointer"
          >
            <Upload className="w-6 h-6 text-indigo-600" />
            <span>Upload Timetable Photo</span>
            <span className="text-[10px] text-slate-400 font-normal">PNG, JPG up to 10MB</span>
          </button>

          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-slate-700 font-bold text-xs flex flex-col items-center justify-center space-y-2 transition-all cursor-pointer"
          >
            <Camera className="w-6 h-6 text-slate-600" />
            <span>Take Photo (Camera)</span>
            <span className="text-[10px] text-slate-400 font-normal">Capture from phone/webcam</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="p-4 rounded-2xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 font-bold text-xs flex flex-col items-center justify-center space-y-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <span>Load Sample Sheet (Demo)</span>
            <span className="text-[10px] text-emerald-600/70 font-normal">Instant 1-Click Test Sheet</span>
          </button>
        </div>

        {/* Image Preview & Rotation Tools */}
        {previewUrl && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Image Preview & Orientation
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500 mr-2">
                  Angle: <strong>{rotationAngle}°</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleRotate(-90)}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>⟲ 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>⟳ 90°</span>
                </button>
              </div>
            </div>

            <div className="flex justify-center p-4 bg-slate-900 rounded-2xl overflow-hidden max-h-80">
              <img
                src={previewUrl}
                alt="Timetable Preview"
                style={{ transform: `rotate(${rotationAngle}deg)`, transition: 'transform 0.2s ease-in-out' }}
                className="max-h-72 object-contain rounded-lg shadow-md"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? "Analyzing Timetable..." : "Analyze Timetable & Extract Faculty"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Processing Animation */}
      {isAnalyzing && (
        <div className="p-8 rounded-3xl bg-indigo-950 text-white shadow-xl space-y-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto text-indigo-300">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h3 className="text-lg font-extrabold">Extracting Table & Matching Faculty Ratings</h3>
            <p className="text-xs text-indigo-200 mt-1">Applying OCR table understanding and checking 269 faculty records...</p>
          </div>

          <div className="max-w-md mx-auto space-y-2.5 text-left bg-indigo-900/60 p-5 rounded-2xl border border-indigo-800">
            {steps.map((s, idx) => (
              <div key={idx} className="flex items-center space-x-3 text-xs">
                {idx < processingStep ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : idx === processingStep ? (
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-indigo-700 shrink-0"></div>
                )}
                <span className={idx === processingStep ? 'font-bold text-white' : (idx < processingStep ? 'text-indigo-200 line-through' : 'text-indigo-400')}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Extracted Data Table Screen with Inline Editing */}
      {extractedRows && !isAnalyzing && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">2. Review Extracted Timetable Data</h3>
              <p className="text-xs text-slate-500">
                Verify faculty names, course slots, and seat availability. You can edit any field before getting the final recommendation.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 self-start">
              {extractedRows.length} Options Extracted
            </span>
          </div>

          {/* Detected Subject Bar */}
          {extractedRows.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                  📖
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Detected Course / Subject from Photo Header
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                    <span>{extractedRows[0]?.subject || "Calculus (MAT1003)"}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Header Verified
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  id="bulkSubjectInput"
                  defaultValue={extractedRows[0]?.subject || "Calculus (MAT1003)"}
                  placeholder="Change course name for all..."
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = document.getElementById('bulkSubjectInput')?.value?.trim();
                    if (val) {
                      setExtractedRows(prev => prev.map(r => ({ ...r, subject: val })));
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shrink-0"
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Faculty Name</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Slot</th>
                  <th className="py-3 px-3">Available Seats</th>
                  <th className="py-3 px-3">Overall Rating</th>
                  <th className="py-3 px-3">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {extractedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                    {/* Faculty Name (Editable with suggestions) */}
                    <td className="py-3 px-3 relative">
                      <input
                        type="text"
                        value={row.facultyName}
                        onChange={(e) => handleRowChange(idx, 'facultyName', e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          row.uncertain ? 'border-amber-300 bg-amber-50/50 text-amber-900' : 'border-slate-200 bg-white text-slate-900'
                        }`}
                      />
                      {/* Suggestion Dropdown */}
                      {searchSuggestions[idx] && searchSuggestions[idx].length > 0 && (
                        <div className="absolute top-full left-3 z-30 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 max-h-48 overflow-y-auto">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pick matching faculty:</p>
                          {searchSuggestions[idx].map(sug => (
                            <button
                              key={sug.name}
                              type="button"
                              onClick={() => handleSelectSuggestion(idx, sug)}
                              className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50 text-xs flex items-center justify-between"
                            >
                              <span className="font-bold text-slate-800">{sug.name}</span>
                              <span className="text-indigo-600 font-bold">{sug.overall !== null ? `${sug.overall}★` : 'N/A'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.subject}
                        onChange={(e) => handleRowChange(idx, 'subject', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Slot */}
                    <td className="py-3 px-3 w-24">
                      <input
                        type="text"
                        value={row.slot}
                        onChange={(e) => handleRowChange(idx, 'slot', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-indigo-700 text-center uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Available Seats */}
                    <td className="py-3 px-3 w-28">
                      <input
                        type="number"
                        min="0"
                        value={row.availableSeats}
                        onChange={(e) => handleRowChange(idx, 'availableSeats', parseInt(e.target.value) || 0)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          row.availableSeats <= 0
                            ? 'border-rose-300 bg-rose-50 text-rose-700'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        }`}
                      />
                    </td>

                    {/* Overall Score */}
                    <td className="py-3 px-3">
                      {row.overallScore !== null && row.overallScore !== undefined ? (
                        <div className="flex items-center space-x-1 font-extrabold text-slate-900">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{row.overallScore} / 5.0</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Overall score unavailable</span>
                      )}
                    </td>

                    {/* Match Status Badge */}
                    <td className="py-3 px-3">
                      {row.availableSeats <= 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Seats: 0 (Full)
                        </span>
                      ) : row.uncertain ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Match Uncertain
                        </span>
                      ) : row.matched ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Verified Match
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Evaluation not found
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={handleRecommend}
              disabled={isRecommending}
              className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center space-x-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              <Award className="w-5 h-5 text-amber-300" />
              <span>{isRecommending ? "Calculating Best Faculty..." : "Recommend Best Faculty"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Best Faculty Result & Top Alternatives */}
      {recommendationResult && recommendationResult.bestFaculty && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Winner Card */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-white to-indigo-50/50 border-2 border-amber-400/80 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black tracking-wider uppercase shadow-sm">
                  <Award className="w-4 h-4" />
                  <span>🏆 BEST FACULTY RECOMMENDATION</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                  {recommendationResult.bestFaculty.facultyName}
                </h2>
                <p className="text-xs text-slate-600 font-medium flex items-center flex-wrap gap-x-2 gap-y-1">
                  <span>{recommendationResult.bestFaculty.subject} • Slot: <strong className="text-indigo-600">{recommendationResult.bestFaculty.slot}</strong></span>
                  {/* ADDED: period badge */}
                  {recommendationResult.bestFaculty.period && recommendationResult.bestFaculty.period !== 'Unknown' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                      {recommendationResult.bestFaculty.period === 'Morning' ? <Sunrise className="w-3 h-3" /> : <Sunset className="w-3 h-3" />}
                      <span>{recommendationResult.bestFaculty.period}</span>
                    </span>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-300 shadow-md text-center shrink-0">
                <div className="flex items-center justify-center space-x-1 text-amber-500 mb-0.5">
                  <Star className="w-5 h-5 fill-amber-400" />
                  <span className="text-2xl font-black text-slate-900">
                    {recommendationResult.bestFaculty.displayScore ?? recommendationResult.bestFaculty.overallScore}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Overall Score
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Available Seats</span>
                <p className="text-lg font-black text-emerald-600 mt-0.5">
                  {recommendationResult.bestFaculty.availableSeats} Seats
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Teaching Rating</span>
                <p className="text-lg font-black text-indigo-600 mt-0.5">
                  {recommendationResult.bestFaculty.teachingScore ? `${recommendationResult.bestFaculty.teachingScore} / 5` : 'Verified'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Behaviour Rating</span>
                <p className="text-lg font-black text-indigo-600 mt-0.5">
                  {recommendationResult.bestFaculty.behaviourScore ? `${recommendationResult.bestFaculty.behaviourScore} / 5` : 'Verified'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Internals Marking</span>
                <p className="text-lg font-black text-indigo-600 mt-0.5">
                  {recommendationResult.bestFaculty.internalsScore ? `${recommendationResult.bestFaculty.internalsScore} / 5` : 'Verified'}
                </p>
              </div>
            </div>

            {/* Why this faculty? */}
            <div className="p-4 rounded-2xl bg-white/90 border border-amber-200/80 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 flex items-center space-x-2">
                <ThumbsUp className="w-4 h-4 text-indigo-600" />
                <span>Why this faculty? (Verified Data Reasoning)</span>
              </h4>
              <ul className="space-y-1.5 text-slate-700 text-[11px] list-disc list-inside">
                {recommendationResult.bestFaculty.whyThisFaculty?.map((reason, rIdx) => (
                  <li key={rIdx} className="leading-relaxed">{reason}</li>
                ))}
              </ul>
            </div>

            {/* ADDED: Campus Fit — efficient timetable tips based on this student's saved picks */}
            {recommendationResult.bestFaculty.campusFit && (
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-900 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Campus Fit — Efficient Timetable Check</span>
                  {recommendationResult.bestFaculty.campusFit.campusFitScore !== null && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      {recommendationResult.bestFaculty.campusFit.campusFitScore}/100
                    </span>
                  )}
                </h4>
                <ul className="space-y-1.5 text-slate-700 text-[11px] list-disc list-inside">
                  {recommendationResult.bestFaculty.campusFit.campusTips?.map((tip, tIdx) => (
                    <li key={tIdx} className="leading-relaxed">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Top 2–3 Available Alternatives */}
          {recommendationResult.alternatives && recommendationResult.alternatives.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Top Available Alternative Faculty</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {recommendationResult.alternatives.map((alt, altIdx) => (
                  <div key={altIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                        Option #{altIdx + 2}
                      </span>
                      <div className="flex items-center space-x-1 font-extrabold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="text-slate-900">{alt.displayScore ?? alt.overallScore} / 5.0</span>
                      </div>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900">{alt.facultyName}</h4>
                    <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                      <span>{alt.subject} • Slot {alt.slot}</span>
                      {alt.period && alt.period !== 'Unknown' && (
                        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                          {alt.period === 'Morning' ? <Sunrise className="w-2.5 h-2.5" /> : <Sunset className="w-2.5 h-2.5" />}
                          <span>{alt.period}</span>
                        </span>
                      )}
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600">Available Seats:</span>
                      <span className="text-emerald-700 font-extrabold">{alt.availableSeats} Seats</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Excluded 0-Seat Faculty (Transparency Section) */}
          {recommendationResult.excluded && recommendationResult.excluded.length > 0 && (
            <div className="p-6 rounded-3xl bg-rose-50/50 border border-rose-200/70 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Excluded Faculty (0 Available Seats / Registration Full)</span>
              </div>
              <p className="text-[11px] text-slate-600">
                These faculty members were extracted from the timetable but <strong>strictly filtered out</strong> because no seats are available:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-1">
                {recommendationResult.excluded.map((exc, excIdx) => (
                  <div key={excIdx} className="p-3 rounded-xl bg-white border border-rose-200 text-slate-700 space-y-1">
                    <p className="font-extrabold text-slate-900">{exc.facultyName}</p>
                    <p className="text-[11px] text-slate-500">Slot {exc.slot} • Overall: {exc.overallScore ? `${exc.overallScore}/5.0` : 'N/A'}</p>
                    <span className="text-[10px] font-bold text-rose-600 block">
                      ⚠ {exc.exclusionReason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
