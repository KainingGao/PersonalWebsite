import Head from "next/head";
import { useEffect, useRef, useState } from "react";

const DEFAULT_SITUATION =
    "I am practicing for software engineering interviews. Help me answer in a natural first-person voice using my background, projects, and experience. Keep answers concise unless the question needs depth.";

const maxSegmentSeconds = 14;
const silenceEndSeconds = 2;
const speechDbThreshold = -52;

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
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Ready");
    const [situation, setSituation] = useState(DEFAULT_SITUATION);
    const [notes, setNotes] = useState("");
    const [logs, setLogs] = useState([]);
    const [suggestion, setSuggestion] = useState(null);
    const [error, setError] = useState("");
    const [questionBuffer, setQuestionBuffer] = useState("");
    const [levelDb, setLevelDb] = useState(null);

    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const timeoutRef = useRef(null);
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
        situationRef.current = situation;
    }, [situation]);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
        return () => stopListening();
    }, []);

    async function startListening() {
        setError("");

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
        setStatus("Stopped");

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

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

            const segmentAge = now - segmentMeta.startedAt;
            const silenceAge = now - segmentMeta.lastSoundAt;

            if (segmentAge > 2600 && silenceAge >= silenceEndSeconds * 1000) {
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

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            if (activeRef.current) {
                recordSegment();
            }

            if (blob.size > 1200 && segmentMeta.hadSound) {
                enqueueAudio(blob);
            }
        };

        recorder.start();
        monitorSilence(recorder, segmentMeta);
        timeoutRef.current = setTimeout(() => {
            if (recorder.state === "recording") {
                recorder.stop();
            }
        }, maxSegmentSeconds * 1000);
    }

    function enqueueAudio(blob) {
        audioQueueRef.current.push(blob);
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
            const blob = audioQueueRef.current.shift();

            try {
                await analyzeAudio(blob);
            } catch (analysisError) {
                setError(analysisError.message || "Something went wrong.");
            }
        }

        processingRef.current = false;
        setIsProcessing(false);
        setStatus(activeRef.current ? "Listening" : "Stopped");
    }

    async function analyzeAudio(blob) {
        try {
            const dataUrl = await blobToDataUrl(blob);
            const response = await fetch("/api/analyze-interview-audio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    audioBase64: dataUrl.split(",")[1],
                    mimeType: blob.type || "audio/webm",
                    situation: situationRef.current,
                    notes: notesRef.current,
                    questionBuffer: questionBufferRef.current,
                    history: historyRef.current.slice(-14)
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "The analysis request failed.");
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
                    <span>{audioQueueRef.current.length ? `${audioQueueRef.current.length} queued` : "Live"}</span>
                    <span>{`Max ${maxSegmentSeconds}s`}</span>
                </section>

                {error ? <p className="error">{error}</p> : null}

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
            </main>

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

                textarea {
                    width: 100%;
                    resize: vertical;
                    border: 1px solid #cec5b7;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #1c2523;
                    font: inherit;
                    line-height: 1.45;
                    padding: 11px;
                }

                textarea:focus {
                    border-color: #236b5d;
                    outline: 3px solid rgba(35, 107, 93, 0.16);
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
