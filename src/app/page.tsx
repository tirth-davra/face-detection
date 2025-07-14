"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import CameraPermissions from "../components/CameraPermissions";
import MobileWebcam from "../components/MobileWebcam";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import Image from "next/image";

// Constants
const MATCH_THRESHOLD = 0.4;
const DETECTION_INTERVAL = 1500; // milliseconds
const AUTO_DETECTION_INTERVAL = 800; // milliseconds
const HOLD_FRAME_DURATION = 8000; // milliseconds

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
  const { user, logout } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const [status, setStatus] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(EMPLOYEES);
  const [recognizedEmployee, setRecognizedEmployee] = useState<Employee | null>(
    null
  );

  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);
  const [detectionHistory, setDetectionHistory] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [matchedFrame, setMatchedFrame] = useState<string | null>(null);
  const [holdFrameUntil, setHoldFrameUntil] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [faceapi, setFaceapi] = useState<any>(null);

  // Camera permission states
  const [cameraPermission, setCameraPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [cameraError, setCameraError] = useState<string>("");

  // Redirect to login if not authenticated (additional protection)
  useEffect(() => {
    const isAuth = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuth) {
      window.location.href = "/login";
    }
  }, []);

  // Camera permission handlers
  const handleCameraPermissionGranted = () => {
    setCameraPermission("granted");
    setCameraError("");
  };

  const handleCameraPermissionDenied = () => {
    setCameraPermission("denied");
    setCameraError("Camera access is required for face recognition");
  };

  const handleUserMedia = () => {
    console.log("Camera stream started successfully");
    setCameraError("");
  };

  const handleUserMediaError = (error: string | DOMException) => {
    console.error("Camera error:", error);
    setCameraError(typeof error === "string" ? error : error.message);
    setCameraPermission("denied");
  };

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
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f4f8fb]">
        {/* Camera Permissions Modal */}
        {cameraPermission !== "granted" && (
          <CameraPermissions
            onPermissionGranted={handleCameraPermissionGranted}
            onPermissionDenied={handleCameraPermissionDenied}
          />
        )}

        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image
                  src="/codelink.png"
                  alt="Codelink Logo"
                  className="hidden sm:block h-8 w-auto"
                  width={800}
                  height={800}
                />
                <Image
                  src="/logo-sticky.png"
                  alt="Codelink Logo"
                  className="block sm:hidden h-8 w-auto"
                  width={800}
                  height={800}
                />
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={logout}
                  className="px-10 py-2.5 text-sm bg-[#f1416c] text-white hover:bg-[#f1416c] transition-colors"
                  style={{
                    borderRadius: "5px",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Camera Error Display */}
          {cameraError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {cameraError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Camera Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold">
                  Live Camera Feed
                </h2>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isAutoDetecting
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-xs sm:text-sm text-gray-600">
                    {isAutoDetecting ? "Detecting" : "Paused"}
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <MobileWebcam
                    ref={webcamRef}
                    onUserMedia={handleUserMedia}
                    onUserMediaError={handleUserMediaError}
                  />

                  {/* Face Detection Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Face positioning guide */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-32 h-40 sm:w-40 sm:h-52 md:w-48 md:h-60 lg:w-56 lg:h-72 xl:w-64 xl:h-80 border-3 border-blue-400 rounded-2xl border-dashed opacity-70 shadow-lg">
                        <div className="absolute -top-6 sm:-top-7 md:-top-8 lg:-top-9 left-1/2 transform -translate-x-1/2 text-sm sm:text-base text-blue-600 font-semibold bg-white px-3 py-2 rounded-lg shadow-md border border-blue-200">
                          Position Face Here
                        </div>
                        
                        {/* Inner guide lines for better positioning */}
                        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full opacity-80"></div>
                        <div className="absolute top-2/3 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full opacity-80"></div>
                        <div className="absolute top-1/2 left-1/3 transform -translate-y-1/2 w-1 h-1 bg-blue-400 rounded-full opacity-80"></div>
                        <div className="absolute top-1/2 left-2/3 transform -translate-y-1/2 w-1 h-1 bg-blue-400 rounded-full opacity-80"></div>
                      </div>
                    </div>

                    {/* Corner guides - made larger and more visible */}
                    <div className="absolute top-6 left-6 w-6 h-6 border-l-4 border-t-4 border-blue-400 opacity-80"></div>
                    <div className="absolute top-6 right-6 w-6 h-6 border-r-4 border-t-4 border-blue-400 opacity-80"></div>
                    <div className="absolute bottom-6 left-6 w-6 h-6 border-l-4 border-b-4 border-blue-400 opacity-80"></div>
                    <div className="absolute bottom-6 right-6 w-6 h-6 border-r-4 border-b-4 border-blue-400 opacity-80"></div>
                    
                    {/* Additional corner guides for larger screens */}
                    <div className="hidden md:block absolute top-8 left-8 w-8 h-8 border-l-4 border-t-4 border-blue-300 opacity-60"></div>
                    <div className="hidden md:block absolute top-8 right-8 w-8 h-8 border-r-4 border-t-4 border-blue-300 opacity-60"></div>
                    <div className="hidden md:block absolute bottom-8 left-8 w-8 h-8 border-l-4 border-b-4 border-blue-300 opacity-60"></div>
                    <div className="hidden md:block absolute bottom-8 right-8 w-8 h-8 border-r-4 border-b-4 border-blue-300 opacity-60"></div>
                  </div>

                  {/* Matched Frame Overlay */}
                  {isMatchedFrameVisible && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
                      <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center">
                        <div className="mb-4">
                          <img
                            src={matchedFrame}
                            alt="Matched Face"
                            className="w-full h-auto rounded-lg border-2 border-green-400 shadow-md"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-center space-x-2">
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-green-600 font-semibold">
                              Access Granted
                            </span>
                          </div>
                          <p className="text-lg font-medium text-gray-900">
                            {recognizedEmployee?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Resuming detection in {countdown}s
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Camera Controls */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsAutoDetecting(!isAutoDetecting)}
                  disabled={!isInitialized || cameraPermission !== "granted"}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isAutoDetecting
                      ? "bg-[#f1416c] text-white hover:bg-[#f1416c] shadow-md hover:shadow-lg"
                      : "bg-[#50cd89] text-white hover:bg-[#50cd89] shadow-md hover:shadow-lg"
                  } disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none`}
                >
                  {isAutoDetecting ? (
                    <>
                      <svg
                        className="w-5 h-5 inline mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 10h6v4H9z"
                        />
                      </svg>
                      Stop Detection
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 inline mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Start Detection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Detection Status */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Detection Status
                </h3>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    matchedFrame && countdown > 0
                      ? "bg-blue-100 text-blue-800"
                      : isAutoDetecting
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {matchedFrame && countdown > 0
                    ? "Processing"
                    : isAutoDetecting
                    ? "Active"
                    : "Inactive"}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Status:</span>
                  <span
                    className={`text-sm font-medium ${
                      status.includes("✅")
                        ? "text-green-600"
                        : status.includes("❌")
                        ? "text-red-600"
                        : "text-gray-900"
                    }`}
                  >
                    {status || "Ready"}
                  </span>
                </div>

                {recognizedEmployee && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {recognizedEmployee.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {recognizedEmployee.id}
                        </p>
                      </div>
                      {/* <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date().toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          {confidence}% confidence
                        </p>
                      </div> */}
                    </div>
                    {/* {confidence > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    )} */}
                  </div>
                )}
              </div>
            </div>

            {/* Employee Database */}
            {/* <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Employee Database
                </h3>
                <div className="text-sm text-gray-600">
                  {employees.length} registered
                </div>
              </div>

              <div className="space-y-3">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {emp.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {emp.name}
                        </p>
                        <p className="text-xs text-gray-500">ID: {emp.id}</p>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.descriptor
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {emp.descriptor ? "✓ Ready" : "✗ Failed"}
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
