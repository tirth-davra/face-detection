"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

// Constants
const MATCH_THRESHOLD = 0.4;
const DETECTION_INTERVAL = 1500; // milliseconds
const AUTO_DETECTION_INTERVAL = 800; // milliseconds
const HOLD_FRAME_DURATION = 8000; // milliseconds
// const ACCESS_LOG_COOLDOWN = 10000; // milliseconds
const FACE_DETECTOR_OPTIONS = {
  inputSize: 416,
  scoreThreshold: 0.5,
};

// Employee database - in a real app, this would come from a database
interface Employee {
  id: number;
  name: string;
  image: string;
  descriptor: Float32Array | null;
}

const EMPLOYEES: Employee[] = [
  { id: 1, name: "kamil", image: "/knwon.jpg", descriptor: null },
  { id: 2, name: "Tirth", image: "/employee2.jpg", descriptor: null },
  { id: 3, name: "Akshay", image: "/employee3.jpg", descriptor: null },
  { id: 4, name: "Jenil", image: "/employee4.jpg", descriptor: null },
  { id: 5, name: "Kamlesh", image: "/employee5.jpg", descriptor: null },
];

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const [status, setStatus] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(EMPLOYEES);
  const [recognizedEmployee, setRecognizedEmployee] = useState<Employee | null>(
    null
  );
  // const [accessLogs, setAccessLogs] = useState<Array<{ employee: Employee; timestamp: Date }>>([]);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);
  const [detectionHistory, setDetectionHistory] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [matchedFrame, setMatchedFrame] = useState<string | null>(null);
  const [holdFrameUntil, setHoldFrameUntil] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [faceapi, setFaceapi] = useState<any>(null);

  // Helper function to find best employee match
  const findBestMatch = (descriptor: Float32Array) => {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const employee of employees) {
      if (employee.descriptor) {
        const distance = faceapi.euclideanDistance(
          employee.descriptor,
          descriptor
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = employee;
        }
      }
    }

    return { bestMatch, bestDistance };
  };

  // Helper function to handle successful face recognition
  const handleSuccessfulMatch = (
    match: Employee,
    distance: number,
    imageSrc: string
  ) => {
    setRecognizedEmployee(match);
    setConfidence(Math.round((1 - distance) * 100));
    setStatus(`✅ Welcome, ${match.name}!`);

    // Capture and hold the matched frame
    setMatchedFrame(imageSrc);
    setHoldFrameUntil(Date.now() + HOLD_FRAME_DURATION);
    setCountdown(8);

    // Stop auto-detection temporarily
    setIsAutoDetecting(false);

    // Add to access log with cooldown
    // setAccessLogs((prev) => {
    //   const lastLog = prev[prev.length - 1];
    //   const timeDiff = lastLog
    //     ? new Date().getTime() - lastLog.timestamp.getTime()
    //     : Infinity;

    //   if (timeDiff > ACCESS_LOG_COOLDOWN) {
    //     return [...prev, { employee: match, timestamp: new Date() }];
    //   }
    //   return prev;
    // });
  };

  // Function to get canvas from video feed (more efficient than base64)
  // This approach is much faster than getScreenshot() + faceapi.fetchImage()
  // because it avoids base64 encoding/decoding and works directly with the video element
  const getCanvasFromVideo = (): HTMLCanvasElement | null => {
    if (!webcamRef.current) return null;

    const video = webcamRef.current.video;
    if (!video) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const autoDetectFace = async () => {
    if (
      !faceapi ||
      !webcamRef.current ||
      !isInitialized ||
      employees.length === 0
    ) {
      return;
    }

    // Prevent too frequent detections
    const now = Date.now();
    if (now - lastDetectionTime < DETECTION_INTERVAL) {
      return;
    }
    setLastDetectionTime(now);

    try {
      // Check if we're in hold frame mode
      if (now < holdFrameUntil) {
        return;
      }

      // Use canvas directly from video feed (much faster than base64)
      const inputImage = getCanvasFromVideo();
      if (!inputImage) return;

      const result = await faceapi
        .detectSingleFace(
          inputImage,
          new faceapi.TinyFaceDetectorOptions(FACE_DETECTOR_OPTIONS)
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) {
        setStatus("Looking for faces...");
        setRecognizedEmployee(null);
        return;
      }

      const { bestMatch, bestDistance } = findBestMatch(result.descriptor);

      if (bestMatch && bestDistance < MATCH_THRESHOLD) {
        // Add to detection history for consistency checking
        setDetectionHistory((prev) => {
          const newHistory = [...prev, bestMatch.name];
          return newHistory.slice(-5);
        });

        // Check for consistent detections
        const recentDetections = detectionHistory.slice(-3);
        const matchCount = recentDetections.filter(
          (name) => name === bestMatch.name
        ).length;

        if (matchCount >= 1 || detectionHistory.length < 2) {
          // Get base64 image only when needed for UI display
          const imageSrc = webcamRef.current?.getScreenshot();
          handleSuccessfulMatch(bestMatch, bestDistance, imageSrc || "");
        }
      } else {
        setStatus("❌ Face not matched. Access denied.");
        setRecognizedEmployee(null);
        setDetectionHistory([]);
        setConfidence(0);
        setMatchedFrame(null);
      }
    } catch (error) {
      console.error("Detection error occurred:", error);
      // Silent error handling - errors are expected during normal operation
      setStatus("Detection error occurred");
    }
  };

  useEffect(() => {
    const loadFaceApi = async () => {
      setStatus("Loading face recognition models...");

      const faceapiModule = await import("@vladmandic/face-api");
      setFaceapi(faceapiModule);

      // Load detection models
      await faceapiModule.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapiModule.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapiModule.nets.faceRecognitionNet.loadFromUri("/models");

      setStatus("Loading employee database...");

      // Load face descriptors for all employees
      const updatedEmployees: Employee[] = [];
      for (const employee of EMPLOYEES) {
        try {
          const image = await faceapiModule.fetchImage(employee.image);
          const detection = await faceapiModule
            .detectSingleFace(
              image,
              new faceapiModule.TinyFaceDetectorOptions(FACE_DETECTOR_OPTIONS)
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            updatedEmployees.push({
              ...employee,
              descriptor: detection.descriptor,
            });
          }
        } catch (error) {
          console.error("Error loading employee descriptor:", error);
          // Silent error handling for individual employee loading
        }
      }

      setEmployees(updatedEmployees);
      setIsInitialized(true);
      setStatus(`Ready! ${updatedEmployees.length} employees loaded.`);
      setIsAutoDetecting(true);
    };

    loadFaceApi();
  }, []);

  // Auto-detection loop
  useEffect(() => {
    if (!isAutoDetecting || !isInitialized) {
      setMatchedFrame(null);
      setHoldFrameUntil(0);
      return;
    }

    const interval = setInterval(autoDetectFace, AUTO_DETECTION_INTERVAL);
    return () => clearInterval(interval);
  }, [
    isAutoDetecting,
    isInitialized,
    faceapi,
    employees,
    detectionHistory,
    holdFrameUntil,
  ]);

  // Countdown timer for matched frame
  useEffect(() => {
    if (holdFrameUntil > 0 && countdown > 0) {
      const timer = setInterval(() => {
        const remaining = Math.ceil((holdFrameUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          setCountdown(0);
          setMatchedFrame(null);
          setHoldFrameUntil(0);
          setIsAutoDetecting(true);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [holdFrameUntil, countdown]);

  const isMatchedFrameVisible = matchedFrame && Date.now() < holdFrameUntil;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-2">
        Office Face Recognition System
      </h1>
      <p className="text-gray-600 mb-6">Employee Access Control</p>

      <div className="relative border rounded overflow-hidden mb-4 shadow-lg">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          width={320}
          height={240}
          videoConstraints={{ facingMode: "user" }}
        />

        {/* Face Detection Guide Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Face positioning guide */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-32 h-40 border-2 border-blue-400 rounded-lg border-dashed opacity-70">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-blue-600 font-medium">
                Position Face Here
              </div>
            </div>
          </div>

          {/* Corner guides */}
          <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-blue-400"></div>
          <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-blue-400"></div>
          <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-blue-400"></div>
          <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-blue-400"></div>
        </div>

        {/* Matched Frame Overlay */}
        {isMatchedFrameVisible && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 max-w-xs">
              <img
                src={matchedFrame}
                alt="Matched Face"
                className="w-full h-auto rounded border-2 border-green-400"
              />
              <div className="mt-2 text-center">
                <div className="text-green-600 font-semibold">
                  ✅ Access Granted
                </div>
                <div className="text-sm text-gray-600">
                  {recognizedEmployee?.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Resuming in {countdown}s
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setIsAutoDetecting(!isAutoDetecting)}
          disabled={!isInitialized}
          className={`px-6 py-2 rounded transition-colors ${
            isAutoDetecting
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-green-600 text-white hover:bg-green-700"
          } disabled:bg-gray-400`}
        >
          {isAutoDetecting ? "Stop Auto-Detection" : "Start Auto-Detection"}
        </button>
      </div>

      {/* Auto-Detection Status */}
      <div className="mb-4 text-center">
        <div
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            matchedFrame && countdown > 0
              ? "bg-blue-100 text-blue-800"
              : isAutoDetecting
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              matchedFrame && countdown > 0
                ? "bg-blue-500 animate-pulse"
                : isAutoDetecting
                ? "bg-green-500 animate-pulse"
                : "bg-gray-500"
            }`}
          ></div>
          {matchedFrame && countdown > 0
            ? `Access Granted - Resuming in ${countdown}s`
            : isAutoDetecting
            ? "Auto-Detection Active"
            : "Auto-Detection Stopped"}
        </div>
      </div>

      {recognizedEmployee && (
        <div className="bg-green-100 border border-green-400 rounded p-4 mb-4 text-center">
          <h3 className="text-lg font-semibold text-green-800">
            Access Granted
          </h3>
          <p className="text-green-700">Employee: {recognizedEmployee.name}</p>
          <p className="text-green-700">ID: {recognizedEmployee.id}</p>
          <p className="text-xs text-green-600">
            Time: {new Date().toLocaleTimeString()}
          </p>
          <div className="mt-2">
            <div className="text-xs text-green-600">
              Confidence: {confidence}%
            </div>
            <div className="w-full bg-green-200 rounded-full h-2 mt-1">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div
          className={`text-lg font-medium mb-4 ${
            status.includes("✅")
              ? "text-green-600"
              : status.includes("❌")
              ? "text-red-600"
              : "text-black"
          }`}
        >
          {status}
        </div>
      )}

      {/* Employee Database Status */}
      <div className="bg-white rounded p-4 shadow max-w-md w-full mb-4">
        <h3 className="text-lg font-semibold mb-2">Employee Database</h3>
        <p className="text-gray-600 mb-2">
          Registered Employees: {employees.length}
        </p>
        <div className="space-y-1">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex justify-between items-center text-sm"
            >
              <span>{emp.name}</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  emp.descriptor
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {emp.descriptor ? "Loaded" : "Failed"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
