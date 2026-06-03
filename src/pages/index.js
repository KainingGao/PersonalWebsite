import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import {
    getUser,
    handleAuthCallback,
    login,
    logout,
    signup
} from "@netlify/identity";

const DEFAULT_SITUATION =
    "I am practicing for software engineering interviews. Help me answer in a natural first-person voice using my background, projects, and experience. Keep answers concise unless the question needs depth.";

const silenceEndSeconds = 2;
const speechDbThreshold = -52;
const testDepositMinutes = 15;

const EMPTY_PROFILE = {
    userId: "",
    displayName: "",
    background: "",
    experiences: "",
    projects: "",
    targetRole: "",
    extraNotes: "",
    balanceMinutes: 0,
    totalDepositedMinutes: 0,
    totalUsedMinutes: 0
};

function buildProfileSituation(profile) {
    const sections = [
        profile.targetRole ? `Target role: ${profile.targetRole}` : "",
        profile.background ? `Background: ${profile.background}` : "",
        profile.experiences ? `Experiences: ${profile.experiences}` : "",
        profile.projects ? `Projects: ${profile.projects}` : "",
        profile.extraNotes ? `Extra notes: ${profile.extraNotes}` : ""
    ].filter(Boolean);

    if (!sections.length) {
        return DEFAULT_SITUATION;
    }

    return `${DEFAULT_SITUATION}\n\nSaved candidate profile:\n${sections.join("\n")}`;
}

function formatMinutes(minutes) {
    const safeMinutes = Math.max(0, Number(minutes || 0));
    const wholeMinutes = Math.floor(safeMinutes);
    const seconds = Math.round((safeMinutes - wholeMinutes) * 60);

    if (wholeMinutes <= 0) {
        return `${seconds}s`;
    }

    return `${wholeMinutes}m ${String(seconds).padStart(2, "0")}s`;
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function makeLogItem(result) {
    const transcript = result.segments?.length
        ? result.segments
              .map((segment) => `${segment.speaker || "Speaker"}: ${segment.text}`)
              .join("\n")
        : result.transcript;

    return {
        id: `${Date.now()}-${Math.random()}`,
        transcript,
        type: result.questionState || (result.shouldAnswer ? "complete_question" : "listened"),
        label: (result.questionState || (result.shouldAnswer ? "complete_question" : "listened"))
            .replaceAll("_", " "),
        reason: result.reason,
        question: result.accumulatedQuestion || result.question,
        summary: result.summary,
        createdAt: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        })
    };
}

export default function Home() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState("login");
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authName, setAuthName] = useState("");
    const [isAuthBusy, setIsAuthBusy] = useState(false);
    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [profileStatus, setProfileStatus] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Ready");
    const [situation, setSituation] = useState(DEFAULT_SITUATION);
    const [notes, setNotes] = useState("");
    const [logs, setLogs] = useState([]);
    const [suggestion, setSuggestion] = useState(null);
    const [error, setError] = useState("");
    const [questionBuffer, setQuestionBuffer] = useState("");
    const [levelDb, setLevelDb] = useState(null);
    const [queueCount, setQueueCount] = useState(0);

    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const meterFrameRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const activeRef = useRef(false);
    const processingRef = useRef(false);
    const audioQueueRef = useRef([]);
    const historyRef = useRef([]);
    const questionBufferRef = useRef("");
    const situationRef = useRef(DEFAULT_SITUATION);
    const notesRef = useRef("");

    useEffect(() => {
        initializeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        situationRef.current = situation;
    }, [situation]);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
        return () => stopListening();
    }, []);

    useEffect(() => {
        if (!isListening) {
            return undefined;
        }

        const timer = setInterval(() => {
            setProfile((current) => {
                const nextBalance = Math.max(0, Number(current.balanceMinutes || 0) - 1 / 60);

                if (nextBalance <= 0) {
                    stopListening();
                    setError("Your interview balance is empty. Add minutes from the dashboard.");
                    setActiveTab("dashboard");
                }

                return {
                    ...current,
                    balanceMinutes: nextBalance
                };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isListening]);

    async function initializeAuth() {
        setIsProfileLoading(true);

        try {
            await handleAuthCallback();
            const currentUser = await getUser();
            setUser(currentUser);

            if (currentUser) {
                await loadProfile();
            } else {
                setProfileStatus("Please log in");
            }
        } catch (authError) {
            setError(authError.message || "Could not initialize login.");
        } finally {
            setIsProfileLoading(false);
        }
    }

    async function loadProfile() {
        setIsProfileLoading(true);

        try {
            const response = await fetch("/api/user-profile", {
                credentials: "include"
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not load profile.");
            }

            applyProfile(data.profile);
            setUser(data.user || (await getUser()));
            setProfileStatus("Profile loaded");
        } catch (profileError) {
            setError(profileError.message || "Could not load profile.");
        } finally {
            setIsProfileLoading(false);
        }
    }

    async function submitAuth(event) {
        event.preventDefault();
        setIsAuthBusy(true);
        setError("");
        setProfileStatus("");

        try {
            const nextUser =
                authMode === "signup"
                    ? await signup(authEmail, authPassword, { full_name: authName })
                    : await login(authEmail, authPassword);

            setUser(nextUser);
            await loadProfile();
            setProfileStatus(authMode === "signup" ? "Account created" : "Logged in");
            setAuthPassword("");
        } catch (authError) {
            setError(authError.message || "Authentication failed.");
        } finally {
            setIsAuthBusy(false);
        }
    }

    async function signOut() {
        stopListening();
        await logout();
        setUser(null);
        setProfile(EMPTY_PROFILE);
        setSuggestion(null);
        setLogs([]);
        historyRef.current = [];
        setProfileStatus("Logged out");
    }

    function applyProfile(nextProfile) {
        const normalized = {
            ...EMPTY_PROFILE,
            ...nextProfile,
            balanceMinutes: Number(nextProfile?.balanceMinutes || 0),
            totalDepositedMinutes: Number(nextProfile?.totalDepositedMinutes || 0),
            totalUsedMinutes: Number(nextProfile?.totalUsedMinutes || 0)
        };

        setProfile(normalized);
        setSituation(buildProfileSituation(normalized));
        setNotes(normalized.extraNotes || "");
    }

    function applyBalanceProfile(nextProfile) {
        setProfile((current) => ({
            ...current,
            balanceMinutes: Number(nextProfile?.balanceMinutes || 0),
            totalDepositedMinutes: Number(nextProfile?.totalDepositedMinutes || 0),
            totalUsedMinutes: Number(nextProfile?.totalUsedMinutes || 0),
            updatedAt: nextProfile?.updatedAt || current.updatedAt
        }));
    }

    function updateProfileField(field, value) {
        setProfile((current) => ({
            ...current,
            [field]: value
        }));
    }

    async function saveProfile() {
        setIsProfileSaving(true);
        setProfileStatus("");
        setError("");

        try {
            const response = await fetch("/api/user-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(profile)
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not save profile.");
            }

            applyProfile(data.profile);
            setProfileStatus("Saved");
        } catch (profileError) {
            setError(profileError.message || "Could not save profile.");
        } finally {
            setIsProfileSaving(false);
        }
    }

    async function addTestBalance() {
        setIsProfileSaving(true);
        setProfileStatus("");
        setError("");

        try {
            const response = await fetch("/api/user-balance", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ minutes: testDepositMinutes })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not add balance.");
            }

            applyBalanceProfile(data.profile);
            setProfileStatus(`Added ${testDepositMinutes} minutes`);
        } catch (profileError) {
            setError(profileError.message || "Could not add balance.");
        } finally {
            setIsProfileSaving(false);
        }
    }

    async function startListening() {
        setError("");

        if (!user) {
            setActiveTab("dashboard");
            setError("Log in before starting an interview session.");
            return;
        }

        if (Number(profile.balanceMinutes || 0) <= 0) {
            setActiveTab("dashboard");
            setError("Add interview minutes before starting a session.");
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Microphone capture is not available in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            streamRef.current = stream;
            setupAudioMeter(stream);
            activeRef.current = true;
            setIsSessionActive(true);
            setIsListening(true);
            setStatus("Listening");
            recordSegment();
        } catch (requestError) {
            setError(requestError.message || "Could not access the microphone.");
        }
    }

    function stopListening() {
        activeRef.current = false;
        setIsListening(false);
        setIsSessionActive(false);
        setStatus("Stopped");

        if (meterFrameRef.current) {
            cancelAnimationFrame(meterFrameRef.current);
            meterFrameRef.current = null;
        }

        if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
        }

        audioContextRef.current?.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    function pauseListening() {
        activeRef.current = false;
        setIsListening(false);
        setStatus("Paused");

        if (meterFrameRef.current) {
            cancelAnimationFrame(meterFrameRef.current);
            meterFrameRef.current = null;
        }

        if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
        }

        audioContextRef.current?.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    async function resumeListening() {
        if (!isSessionActive) {
            await startListening();
            return;
        }

        setError("");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            streamRef.current = stream;
            setupAudioMeter(stream);
            activeRef.current = true;
            setIsListening(true);
            setStatus("Listening");
            recordSegment();
        } catch (requestError) {
            setError(requestError.message || "Could not access the microphone.");
        }
    }

    function setupAudioMeter(stream) {
        audioContextRef.current?.close();
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return;
        }

        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 1024;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
    }

    function readCurrentDb() {
        const analyser = analyserRef.current;

        if (!analyser) {
            return null;
        }

        const samples = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(samples);

        let sumSquares = 0;
        for (const sample of samples) {
            const centered = (sample - 128) / 128;
            sumSquares += centered * centered;
        }

        const rms = Math.sqrt(sumSquares / samples.length);
        return 20 * Math.log10(Math.max(rms, 0.00001));
    }

    function monitorSilence(recorder, segmentMeta) {
        const tick = () => {
            if (!activeRef.current || recorder.state !== "recording") {
                return;
            }

            const now = performance.now();
            const db = readCurrentDb();

            if (db !== null) {
                if (now - segmentMeta.lastUiUpdateAt > 250) {
                    segmentMeta.lastUiUpdateAt = now;
                    setLevelDb(Math.round(db));
                }

                if (db > speechDbThreshold) {
                    segmentMeta.hadSound = true;
                    segmentMeta.lastSoundAt = now;
                }
            }

            const silenceAge = now - segmentMeta.lastSoundAt;

            if (segmentMeta.hadSound && silenceAge >= silenceEndSeconds * 1000) {
                segmentMeta.stoppedForSilence = true;
                recorder.stop();
                return;
            }

            meterFrameRef.current = requestAnimationFrame(tick);
        };

        meterFrameRef.current = requestAnimationFrame(tick);
    }

    function recordSegment() {
        if (!activeRef.current || !streamRef.current) {
            return;
        }

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";
        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        const chunks = [];
        const segmentMeta = {
            startedAt: performance.now(),
            lastSoundAt: performance.now(),
            lastUiUpdateAt: 0,
            hadSound: false,
            stoppedForSilence: false
        };

        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });

            if (activeRef.current) {
                recordSegment();
            }

            if (blob.size > 1200 && segmentMeta.hadSound) {
                enqueueAudio({
                    blob,
                    durationSeconds: (performance.now() - segmentMeta.startedAt) / 1000
                });
            }
        };

        recorder.start();
        monitorSilence(recorder, segmentMeta);
    }

    function enqueueAudio(item) {
        audioQueueRef.current.push(item);
        setQueueCount(audioQueueRef.current.length);
        processAudioQueue();
    }

    async function processAudioQueue() {
        if (processingRef.current) {
            return;
        }

        processingRef.current = true;
        setIsProcessing(true);
        setStatus("Thinking");

        while (audioQueueRef.current.length) {
            const item = audioQueueRef.current.shift();
            setQueueCount(audioQueueRef.current.length);

            try {
                await analyzeAudio(item);
            } catch (analysisError) {
                setError(analysisError.message || "Something went wrong.");

                if (analysisError.status === 402) {
                    stopListening();
                    setActiveTab("dashboard");
                    audioQueueRef.current = [];
                    setQueueCount(0);
                }
            }
        }

        processingRef.current = false;
        setIsProcessing(false);
        setStatus(activeRef.current ? "Listening" : "Stopped");
        setQueueCount(audioQueueRef.current.length);
    }

    async function analyzeAudio({ blob, durationSeconds }) {
        try {
            const dataUrl = await blobToDataUrl(blob);
            const response = await fetch("/api/analyze-interview-audio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    audioBase64: dataUrl.split(",")[1],
                    mimeType: blob.type || "audio/webm",
                    situation: situationRef.current,
                    notes: notesRef.current,
                    questionBuffer: questionBufferRef.current,
                    history: historyRef.current.slice(-14),
                    durationSeconds
                })
            });

            const result = await response.json();

            if (!response.ok) {
                const requestError = new Error(result.error || "The analysis request failed.");
                requestError.status = response.status;

                if (result.profile) {
                    applyBalanceProfile(result.profile);
                }

                throw requestError;
            }

            if (result.profile) {
                applyBalanceProfile(result.profile);
            }

            if (!result.transcript?.trim() && !result.segments?.length) {
                return;
            }

            const logItem = makeLogItem(result);
            setLogs((current) => [logItem, ...current].slice(0, 18));

            historyRef.current = [
                ...historyRef.current,
                {
                    transcript: logItem.transcript,
                    summary: result.summary,
                    questionState: result.questionState,
                    question: result.accumulatedQuestion || result.question,
                    shouldAnswer: result.shouldAnswer
                }
            ].slice(-24);

            if (result.questionState === "partial_question") {
                const nextBuffer = result.accumulatedQuestion || result.questionFragment || "";
                questionBufferRef.current = nextBuffer;
                setQuestionBuffer(nextBuffer);
            }

            if (result.shouldAnswer) {
                questionBufferRef.current = "";
                setQuestionBuffer("");
                setSuggestion({
                    question: result.accumulatedQuestion || result.question,
                    answer: result.answer,
                    bullets: result.bullets || [],
                    followUp: result.followUp,
                    createdAt: logItem.createdAt
                });
            }

            if (result.questionState === "candidate_answering") {
                questionBufferRef.current = "";
                setQuestionBuffer("");
            }
        } catch (analysisError) {
            throw analysisError;
        }
    }

    return (
        <>
            <Head>
                <title>Interview Helper</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, viewport-fit=cover"
                />
            </Head>
            {isSessionActive ? (
                <main className="sessionShell">
                    <section className="sessionTop">
                        <div>
                            <p className="eyebrow">Interview live</p>
                            <h1>{suggestion ? "Answer cue" : "Listening"}</h1>
                        </div>
                        <div className={`sessionDot ${isListening ? "active" : ""}`}>
                            <span />
                            {isProcessing ? "Thinking" : status}
                        </div>
                    </section>

                    {error ? <p className="error">{error}</p> : null}

                    <section className="answerFrame">
                        {suggestion ? (
                            <>
                                <p className="currentQuestion">{suggestion.question}</p>
                                <p className="currentAnswer">{suggestion.answer}</p>
                                {suggestion.bullets?.length ? (
                                    <ul>
                                        {suggestion.bullets.map((bullet) => (
                                            <li key={bullet}>{bullet}</li>
                                        ))}
                                    </ul>
                                ) : null}
                                {suggestion.followUp ? (
                                    <p className="followUp">{suggestion.followUp}</p>
                                ) : null}
                            </>
                        ) : (
                            <div className="waitingFrame">
                                <p>Waiting for the next interviewer question.</p>
                            </div>
                        )}
                    </section>

                    <section className="sessionIndicator">
                        <span>{questionBuffer ? "Building question" : "Ready"}</span>
                        <span>{isProcessing ? "Analyzing" : isListening ? "Recording" : "Paused"}</span>
                        <span>{queueCount ? `${queueCount} queued` : `${levelDb ?? "--"} dB`}</span>
                    </section>

                    <section className="sessionBottom">
                        <div>
                            <p className="eyebrow">Remaining</p>
                            <strong>{formatMinutes(profile.balanceMinutes)}</strong>
                        </div>
                        <button onClick={isListening ? pauseListening : resumeListening}>
                            {isListening ? "Pause" : "Resume"}
                        </button>
                        <button className="stopSession" onClick={stopListening}>
                            Stop
                        </button>
                    </section>
                </main>
            ) : (
            <main className="appShell">
                <section className="topBar">
                    <div>
                        <p className="eyebrow">Live interview notes</p>
                        <h1>Interview Helper</h1>
                    </div>
                    <div className={`status ${isListening ? "active" : ""}`}>
                        <span />
                        {status}
                    </div>
                </section>

                <section className="tabBar" aria-label="Main views">
                    <button
                        className={activeTab === "dashboard" ? "selected" : ""}
                        onClick={() => setActiveTab("dashboard")}
                    >
                        Dashboard
                    </button>
                    <button
                        className={activeTab === "interview" ? "selected" : ""}
                        onClick={() => setActiveTab("interview")}
                    >
                        Interview
                    </button>
                </section>

                {error ? <p className="error">{error}</p> : null}

                {activeTab === "dashboard" ? (
                    <>
                        {!user ? (
                            <section className="authPanel">
                                <div className="sectionHeader">
                                    <h2>{authMode === "signup" ? "Create account" : "Log in"}</h2>
                                    <button
                                        className="linkButton"
                                        onClick={() =>
                                            setAuthMode(authMode === "signup" ? "login" : "signup")
                                        }
                                    >
                                        {authMode === "signup" ? "Use login" : "Sign up"}
                                    </button>
                                </div>
                                <form onSubmit={submitAuth}>
                                    {authMode === "signup" ? (
                                        <label htmlFor="authName">
                                            Name
                                            <input
                                                id="authName"
                                                value={authName}
                                                onChange={(event) => setAuthName(event.target.value)}
                                                autoComplete="name"
                                            />
                                        </label>
                                    ) : null}
                                    <label htmlFor="authEmail">
                                        Email
                                        <input
                                            id="authEmail"
                                            type="email"
                                            value={authEmail}
                                            onChange={(event) => setAuthEmail(event.target.value)}
                                            autoComplete="email"
                                            required
                                        />
                                    </label>
                                    <label htmlFor="authPassword">
                                        Password
                                        <input
                                            id="authPassword"
                                            type="password"
                                            value={authPassword}
                                            onChange={(event) => setAuthPassword(event.target.value)}
                                            autoComplete={
                                                authMode === "signup"
                                                    ? "new-password"
                                                    : "current-password"
                                            }
                                            required
                                        />
                                    </label>
                                    <button className="saveButton" disabled={isAuthBusy}>
                                        {isAuthBusy
                                            ? "Working..."
                                            : authMode === "signup"
                                              ? "Create account"
                                              : "Log in"}
                                    </button>
                                </form>
                                <p className="helperText">
                                    Each account gets its own saved profile and balance.
                                </p>
                            </section>
                        ) : (
                            <section className="accountPanel">
                                <div>
                                    <p className="eyebrow">Signed in</p>
                                    <strong>{user.email}</strong>
                                </div>
                                <button onClick={signOut}>Log out</button>
                            </section>
                        )}

                        <section className="balancePanel">
                            <div>
                                <p className="eyebrow">Available balance</p>
                                <strong>{formatMinutes(profile.balanceMinutes)}</strong>
                            </div>
                            <button onClick={addTestBalance} disabled={isProfileSaving || !user}>
                                Add {testDepositMinutes}m
                            </button>
                        </section>

                        <section className="statsStrip">
                            <span>{formatMinutes(profile.totalDepositedMinutes)} added</span>
                            <span>{formatMinutes(profile.totalUsedMinutes)} used</span>
                            <span>{isProfileLoading ? "Loading" : profileStatus || "Ready"}</span>
                        </section>

                        <section className="fieldGroup">
                            <label htmlFor="displayName">Name</label>
                            <input
                                id="displayName"
                                value={profile.displayName}
                                onChange={(event) =>
                                    updateProfileField("displayName", event.target.value)
                                }
                                placeholder="Your name"
                                disabled={!user}
                            />
                        </section>

                        <section className="fieldGroup">
                            <label htmlFor="targetRole">Target role</label>
                            <input
                                id="targetRole"
                                value={profile.targetRole}
                                onChange={(event) =>
                                    updateProfileField("targetRole", event.target.value)
                                }
                                placeholder="Frontend engineer, backend engineer, PM..."
                                disabled={!user}
                            />
                        </section>

                        <section className="fieldGroup">
                            <label htmlFor="background">Background</label>
                            <textarea
                                id="background"
                                value={profile.background}
                                onChange={(event) =>
                                    updateProfileField("background", event.target.value)
                                }
                                rows={4}
                                placeholder="Education, current work, strengths, interests."
                                disabled={!user}
                            />
                        </section>

                        <section className="fieldGroup">
                            <label htmlFor="experiences">Experiences</label>
                            <textarea
                                id="experiences"
                                value={profile.experiences}
                                onChange={(event) =>
                                    updateProfileField("experiences", event.target.value)
                                }
                                rows={5}
                                placeholder="Past roles, internships, leadership, metrics, impact."
                                disabled={!user}
                            />
                        </section>

                        <section className="fieldGroup">
                            <label htmlFor="projects">Projects</label>
                            <textarea
                                id="projects"
                                value={profile.projects}
                                onChange={(event) =>
                                    updateProfileField("projects", event.target.value)
                                }
                                rows={5}
                                placeholder="Project names, tech stack, what you built, what changed."
                                disabled={!user}
                            />
                        </section>

                        <section className="fieldGroup">
                            <label htmlFor="extraNotes">Extra answer notes</label>
                            <textarea
                                id="extraNotes"
                                value={profile.extraNotes}
                                onChange={(event) =>
                                    updateProfileField("extraNotes", event.target.value)
                                }
                                rows={4}
                                placeholder="Stories to emphasize, companies, constraints, or topics to avoid."
                                disabled={!user}
                            />
                        </section>

                        <button
                            className="saveButton"
                            onClick={saveProfile}
                            disabled={isProfileSaving || !user}
                        >
                            {isProfileSaving ? "Saving..." : "Save dashboard"}
                        </button>

                        <p className="helperText">
                            {user ? `Account ID: ${profile.userId}` : "Log in to edit dashboard data."}
                        </p>
                    </>
                ) : (
                    <>
                        <section className="balancePanel compactBalance">
                            <div>
                                <p className="eyebrow">Remaining</p>
                                <strong>{formatMinutes(profile.balanceMinutes)}</strong>
                            </div>
                            <button onClick={() => setActiveTab("dashboard")}>Dashboard</button>
                        </section>

                <section className="controls">
                    <button
                        className={`listenButton ${isListening ? "stop" : ""}`}
                        onClick={isListening ? stopListening : startListening}
                    >
                        {isListening ? "Stop" : "Start"}
                    </button>
                    <div className="meter">
                        <div className={isListening ? "pulse" : ""} />
                        <span>
                            {isProcessing
                                ? "Analyzing the latest audio..."
                                : `Ends after ${silenceEndSeconds}s silence`}
                        </span>
                    </div>
                </section>

                <section className="signalStrip">
                    <span>{levelDb === null ? "Mic waiting" : `${levelDb} dB`}</span>
                    <span>{queueCount ? `${queueCount} queued` : "Live"}</span>
                    <span>Silence chunk</span>
                </section>

                <section className="fieldGroup">
                    <label htmlFor="situation">Your situation</label>
                    <textarea
                        id="situation"
                        value={situation}
                        onChange={(event) => setSituation(event.target.value)}
                        rows={5}
                    />
                </section>

                <section className="fieldGroup compact">
                    <label htmlFor="notes">Quick facts to use</label>
                    <textarea
                        id="notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={4}
                        placeholder="Paste resume bullets, projects, company notes, or things you want the answer to mention."
                    />
                </section>

                <section className="suggestionPanel">
                    <div className="sectionHeader">
                        <h2>Suggested answer</h2>
                        {suggestion?.createdAt ? <span>{suggestion.createdAt}</span> : null}
                    </div>
                    {questionBuffer ? (
                        <div className="bufferNotice">
                            <span>Building question</span>
                            <p>{questionBuffer}</p>
                        </div>
                    ) : null}
                    {suggestion ? (
                        <div className="suggestion">
                            <p className="question">{suggestion.question}</p>
                            <p className="answer">{suggestion.answer}</p>
                            {suggestion.bullets?.length ? (
                                <ul>
                                    {suggestion.bullets.map((bullet) => (
                                        <li key={bullet}>{bullet}</li>
                                    ))}
                                </ul>
                            ) : null}
                            {suggestion.followUp ? (
                                <p className="followUp">{suggestion.followUp}</p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="empty">
                            Start listening. When Zara or another interviewer asks a question,
                            answer notes will appear here.
                        </p>
                    )}
                </section>

                <section className="logPanel">
                    <div className="sectionHeader">
                        <h2>Recent audio</h2>
                        <span>{logs.length}</span>
                    </div>
                    <div className="logList">
                        {logs.map((log) => (
                            <article className="logItem" key={log.id}>
                                <div>
                                    <span className={`tag ${log.type}`}>{log.label}</span>
                                    <time>{log.createdAt}</time>
                                </div>
                                {log.question ? <p className="logQuestion">{log.question}</p> : null}
                                {log.summary ? <p className="summary">{log.summary}</p> : null}
                                <pre>{log.transcript}</pre>
                                <p className="reason">{log.reason}</p>
                            </article>
                        ))}
                    </div>
                </section>
                    </>
                )}
            </main>
            )}

            <style jsx>{`
                :global(html),
                :global(body),
                :global(#__next) {
                    min-height: 100%;
                    margin: 0;
                    background: #f4f0e8;
                    color: #1c2523;
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
                        "Segoe UI", sans-serif;
                }

                :global(*) {
                    box-sizing: border-box;
                }

                .appShell {
                    width: min(100%, 520px);
                    min-height: 100svh;
                    margin: 0 auto;
                    padding: max(18px, env(safe-area-inset-top)) 16px
                        max(28px, env(safe-area-inset-bottom));
                }

                .sessionShell {
                    width: min(100%, 520px);
                    min-height: 100svh;
                    margin: 0 auto;
                    display: grid;
                    grid-template-rows: auto 1fr auto auto;
                    gap: 12px;
                    padding: max(18px, env(safe-area-inset-top)) 16px
                        max(18px, env(safe-area-inset-bottom));
                    background: #f4f0e8;
                }

                .sessionTop,
                .sessionBottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .sessionTop h1 {
                    font-size: 1.9rem;
                }

                .sessionDot {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    min-height: 34px;
                    padding: 8px 10px;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                    color: #57635e;
                    font-size: 0.8rem;
                    font-weight: 850;
                }

                .sessionDot span {
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: #8a948d;
                }

                .sessionDot.active span {
                    background: #1d9a5b;
                }

                .answerFrame {
                    min-height: 0;
                    overflow-y: auto;
                    display: grid;
                    align-content: start;
                    gap: 14px;
                    padding: 18px;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                    box-shadow: 0 18px 44px rgba(38, 32, 21, 0.08);
                }

                .currentQuestion {
                    color: #236b5d;
                    font-size: 0.98rem;
                    font-weight: 900;
                    line-height: 1.35;
                }

                .currentAnswer {
                    color: #17211e;
                    font-size: 1.26rem;
                    font-weight: 850;
                    line-height: 1.42;
                }

                .waitingFrame {
                    min-height: 46svh;
                    display: grid;
                    place-items: center;
                    color: #68756e;
                    text-align: center;
                    font-size: 1rem;
                    font-weight: 750;
                    line-height: 1.45;
                }

                .sessionIndicator {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }

                .sessionIndicator span {
                    min-height: 32px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fbf7ed;
                    color: #52605a;
                    font-size: 0.72rem;
                    font-weight: 900;
                    text-align: center;
                }

                .sessionBottom {
                    padding-top: 4px;
                }

                .sessionBottom strong {
                    display: block;
                    margin-top: 3px;
                    color: #143d35;
                    font-size: 1.35rem;
                    line-height: 1;
                }

                .sessionBottom button {
                    min-width: 94px;
                    min-height: 54px;
                    border: 0;
                    border-radius: 8px;
                    background: #143d35;
                    color: #ffffff;
                    font: inherit;
                    font-weight: 900;
                }

                .sessionBottom .stopSession {
                    background: #b84036;
                }

                .topBar {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 8px 0 18px;
                }

                .eyebrow,
                h1,
                h2,
                p {
                    margin: 0;
                }

                .eyebrow {
                    color: #68756e;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                h1 {
                    margin-top: 3px;
                    font-size: 2rem;
                    line-height: 1;
                }

                h2 {
                    font-size: 1rem;
                }

                .status {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    min-height: 34px;
                    padding: 8px 10px;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                    color: #57635e;
                    font-size: 0.82rem;
                    font-weight: 700;
                }

                .status span {
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: #8a948d;
                }

                .status.active span {
                    background: #1d9a5b;
                }

                .controls {
                    display: grid;
                    grid-template-columns: 120px 1fr;
                    align-items: stretch;
                    gap: 10px;
                    margin-bottom: 14px;
                }

                .tabBar {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-bottom: 14px;
                    padding: 4px;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                }

                .tabBar button,
                .balancePanel button,
                .saveButton {
                    min-height: 42px;
                    border: 0;
                    border-radius: 7px;
                    font: inherit;
                    font-weight: 850;
                }

                .tabBar button {
                    background: transparent;
                    color: #52605a;
                }

                .tabBar .selected {
                    background: #173d36;
                    color: #ffffff;
                }

                .balancePanel {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    margin-bottom: 10px;
                    padding: 14px;
                    border: 1px solid #cddfd6;
                    border-radius: 8px;
                    background: #f1faf5;
                }

                .authPanel,
                .accountPanel {
                    margin-bottom: 14px;
                    padding: 14px;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                }

                .authPanel form {
                    display: grid;
                    gap: 12px;
                }

                .authPanel label {
                    margin-bottom: 0;
                }

                .authPanel input {
                    margin-top: 8px;
                }

                .accountPanel {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .accountPanel strong {
                    display: block;
                    overflow-wrap: anywhere;
                    margin-top: 3px;
                    color: #143d35;
                    font-size: 0.95rem;
                }

                .accountPanel button,
                .linkButton {
                    border: 0;
                    border-radius: 7px;
                    background: #ece5d9;
                    color: #33413c;
                    font: inherit;
                    font-weight: 850;
                }

                .accountPanel button {
                    min-height: 38px;
                    padding: 0 12px;
                }

                .linkButton {
                    min-height: 32px;
                    padding: 0 10px;
                    font-size: 0.8rem;
                }

                .balancePanel strong {
                    display: block;
                    margin-top: 4px;
                    color: #143d35;
                    font-size: 2rem;
                    line-height: 1;
                }

                .balancePanel button,
                .saveButton {
                    padding: 0 14px;
                    background: #143d35;
                    color: #ffffff;
                }

                .balancePanel button:disabled,
                .saveButton:disabled {
                    opacity: 0.62;
                }

                .compactBalance strong {
                    font-size: 1.45rem;
                }

                .statsStrip {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 14px;
                }

                .statsStrip span {
                    min-height: 34px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                    color: #52605a;
                    font-size: 0.74rem;
                    font-weight: 850;
                    text-align: center;
                }

                .saveButton {
                    width: 100%;
                    min-height: 54px;
                    margin-bottom: 10px;
                    font-size: 1rem;
                    box-shadow: 0 10px 24px rgba(20, 61, 53, 0.18);
                }

                .helperText {
                    overflow-wrap: anywhere;
                    color: #68756e;
                    font-size: 0.76rem;
                    line-height: 1.35;
                    text-align: center;
                }

                .listenButton {
                    min-height: 68px;
                    border: 0;
                    border-radius: 8px;
                    background: #143d35;
                    color: #ffffff;
                    font-size: 1.12rem;
                    font-weight: 800;
                    box-shadow: 0 10px 24px rgba(20, 61, 53, 0.22);
                }

                .listenButton.stop {
                    background: #b84036;
                    box-shadow: 0 10px 24px rgba(184, 64, 54, 0.2);
                }

                .meter {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-height: 68px;
                    padding: 12px;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                    color: #44504b;
                    font-size: 0.9rem;
                    font-weight: 700;
                }

                .meter > div {
                    width: 18px;
                    height: 18px;
                    border-radius: 999px;
                    background: #d6cdc0;
                }

                .meter .pulse {
                    background: #1d9a5b;
                    animation: pulse 1.2s ease-in-out infinite;
                }

                .signalStrip {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin: -2px 0 14px;
                }

                .signalStrip span {
                    min-height: 30px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fbf7ed;
                    color: #52605a;
                    font-size: 0.76rem;
                    font-weight: 850;
                }

                @keyframes pulse {
                    0%,
                    100% {
                        transform: scale(0.82);
                        opacity: 0.68;
                    }
                    50% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                .error {
                    margin-bottom: 14px;
                    padding: 12px;
                    border: 1px solid #e2aaa4;
                    border-radius: 8px;
                    background: #fff2ef;
                    color: #8d2920;
                    font-weight: 700;
                }

                .fieldGroup,
                .suggestionPanel,
                .logPanel {
                    margin-bottom: 14px;
                    padding: 14px;
                    border: 1px solid #d9d2c4;
                    border-radius: 8px;
                    background: #fffaf1;
                }

                .fieldGroup.compact {
                    background: #fbf7ed;
                }

                label {
                    display: block;
                    margin-bottom: 8px;
                    color: #3d4844;
                    font-size: 0.86rem;
                    font-weight: 800;
                }

                input,
                textarea {
                    width: 100%;
                    border: 1px solid #cec5b7;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #1c2523;
                    font: inherit;
                    line-height: 1.45;
                    padding: 11px;
                }

                input {
                    min-height: 45px;
                }

                textarea {
                    resize: vertical;
                }

                input:focus,
                textarea:focus {
                    border-color: #236b5d;
                    outline: 3px solid rgba(35, 107, 93, 0.16);
                }

                input:disabled,
                textarea:disabled {
                    background: #f4f0e8;
                    color: #7b8580;
                }

                .sectionHeader {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 11px;
                }

                .sectionHeader span {
                    color: #68756e;
                    font-size: 0.82rem;
                    font-weight: 800;
                }

                .suggestion {
                    display: grid;
                    gap: 12px;
                }

                .bufferNotice {
                    display: grid;
                    gap: 7px;
                    margin-bottom: 12px;
                    padding: 10px;
                    border: 1px solid #cddfd6;
                    border-radius: 8px;
                    background: #f1faf5;
                }

                .bufferNotice span {
                    color: #12613e;
                    font-size: 0.73rem;
                    font-weight: 900;
                    text-transform: uppercase;
                }

                .bufferNotice p {
                    color: #203b34;
                    font-size: 0.9rem;
                    font-weight: 750;
                    line-height: 1.35;
                }

                .question {
                    color: #236b5d;
                    font-size: 0.92rem;
                    font-weight: 800;
                    line-height: 1.35;
                }

                .answer {
                    font-size: 1.08rem;
                    font-weight: 750;
                    line-height: 1.45;
                }

                ul {
                    display: grid;
                    gap: 8px;
                    margin: 0;
                    padding-left: 20px;
                    color: #2f3a36;
                    line-height: 1.35;
                }

                .followUp,
                .empty,
                .reason {
                    color: #68756e;
                    font-size: 0.9rem;
                    line-height: 1.45;
                }

                .followUp {
                    padding-top: 10px;
                    border-top: 1px solid #e4ddd1;
                }

                .logList {
                    display: grid;
                    gap: 10px;
                }

                .logItem {
                    padding: 12px;
                    border: 1px solid #e1d9cd;
                    border-radius: 8px;
                    background: #ffffff;
                }

                .logItem > div {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .tag {
                    padding: 4px 7px;
                    border-radius: 6px;
                    background: #e9e2d7;
                    color: #46504c;
                    font-size: 0.72rem;
                    font-weight: 900;
                    text-transform: uppercase;
                }

                .tag.question {
                    background: #dcece4;
                    color: #12613e;
                }

                .tag.complete_question {
                    background: #dcece4;
                    color: #12613e;
                }

                .tag.partial_question {
                    background: #fff1cc;
                    color: #7a5413;
                }

                .tag.candidate_answering {
                    background: #e7e3f6;
                    color: #4c3c82;
                }

                time {
                    color: #738079;
                    font-size: 0.76rem;
                    font-weight: 800;
                }

                .logQuestion {
                    margin-bottom: 8px;
                    color: #173d36;
                    font-weight: 800;
                    line-height: 1.35;
                }

                .summary {
                    margin-bottom: 8px;
                    color: #40504a;
                    font-size: 0.88rem;
                    font-weight: 700;
                    line-height: 1.35;
                }

                pre {
                    overflow-x: auto;
                    white-space: pre-wrap;
                    margin: 0 0 8px;
                    color: #34413c;
                    font-family: inherit;
                    font-size: 0.88rem;
                    line-height: 1.4;
                }

                @media (max-width: 390px) {
                    .appShell {
                        padding-inline: 12px;
                    }

                    h1 {
                        font-size: 1.72rem;
                    }

                    .controls {
                        grid-template-columns: 106px 1fr;
                    }
                }
            `}</style>
        </>
    );
}
