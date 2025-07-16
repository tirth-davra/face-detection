"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import CameraPermissions from "../components/CameraPermissions";
import MobileWebcam from "../components/MobileWebcam";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Constants
const MATCH_THRESHOLD = 0.4;
const DETECTION_INTERVAL = 1500; // milliseconds
const AUTO_DETECTION_INTERVAL = 800; // milliseconds
const HOLD_FRAME_DURATION = 3000; // milliseconds (3 seconds)

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
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
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

  // Menu state
  const [showMenu, setShowMenu] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Camera permission states
  const [cameraPermission, setCameraPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [cameraError, setCameraError] = useState<string>("");

  // No authentication check needed for home page - it's the initial page

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
    setCameraError("");
  };

  const handleUserMediaError = (error: string | DOMException) => {
    setCameraError(typeof error === "string" ? error : error.message);
    setCameraPermission("denied");
  };

  // Handle tap/click detection for menu
  const handleScreenTap = () => {
    const now = Date.now();
    const timeDiff = now - lastTapTime;

    // Reset tap count if more than 2 seconds have passed
    if (timeDiff > 2000) {
      setTapCount(1);
    } else {
      setTapCount((prev) => prev + 1);
    }

    setLastTapTime(now);

    // Show menu after 3 taps
    if (tapCount >= 2) {
      // This will trigger on the 3rd tap
      setShowMenu(true);
      setTapCount(0);
    }
  };

  // Close menu
  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  // Handle add new face
  const handleAddNewFace = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any default form submission
    e.stopPropagation(); // Stop event bubbling

    // Close menu first
    setShowMenu(false);

    // Check authentication and admin status directly
    const isAuth = localStorage.getItem("isAuthenticated") === "true";
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (!isAuth || !isAdmin) {
      // Use router for navigation
      router.push("/login");
    } else {
      // Use router for navigation
      router.push("/add-new-face");
    }
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

    // Use employee's profile image instead of live capture
    setMatchedFrame(match.image);
    setHoldFrameUntil(Date.now() + HOLD_FRAME_DURATION);
    setCountdown(Math.ceil(HOLD_FRAME_DURATION / 1000)); // Set countdown to full duration

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
    const now = Date.now();
    // Prevent any detection or state changes during hold period
    if (now < holdFrameUntil) {
      return;
    }

    if (
      !faceapi ||
      !webcamRef.current ||
      !isInitialized ||
      employees.length === 0
    ) {
      return;
    }

    // Prevent too frequent detections
    if (now - lastDetectionTime < DETECTION_INTERVAL) {
      return;
    }
    setLastDetectionTime(now);

    try {
      // Use canvas directly from video feed (much faster than base64)
      const inputImage = getCanvasFromVideo();
      if (!inputImage) {
        return;
      }

      const result = await faceapi
        .detectSingleFace(
          inputImage,
          new faceapi.TinyFaceDetectorOptions(FACE_DETECTOR_OPTIONS)
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) {
        setStatus("Looking for faces...");
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
          // No need to capture screenshot since we'll use employee's profile image
          handleSuccessfulMatch(bestMatch, bestDistance, "");
        }
      } else {
        setStatus("❌ Face not matched. Access denied.");
        setDetectionHistory([]);
        setConfidence(0);
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
      return;
    }

    const interval = setInterval(autoDetectFace, AUTO_DETECTION_INTERVAL);
    return () => clearInterval(interval);
  }, [isAutoDetecting, isInitialized, faceapi, employees, detectionHistory]);

  // Countdown timer for matched frame
  useEffect(() => {
    if (holdFrameUntil > 0 && countdown > 0) {
      const timer = setInterval(() => {
        const remaining = Math.ceil((holdFrameUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          // Only clear when the full duration has passed
          setCountdown(0);
          setMatchedFrame(null);
          setHoldFrameUntil(0);
          // Add a small delay before restarting auto-detection
          setTimeout(() => {
            setIsAutoDetecting(true);
          }, 500);
        }
      }, 1000); // Check every second for better performance

      return () => clearInterval(timer);
    }
  }, [holdFrameUntil, countdown]);

  const isMatchedFrameVisible =
    matchedFrame && holdFrameUntil > 0 && Date.now() < holdFrameUntil;

  // No loading check needed for home page

  return (
    <div className="fixed inset-0 min-h-screen bg-[#f4f8fb] flex flex-col">
      {/* Camera Permissions Modal */}
      {cameraPermission !== "granted" && (
        <CameraPermissions
          onPermissionGranted={handleCameraPermissionGranted}
          onPermissionDenied={handleCameraPermissionDenied}
        />
      )}

      {/* Main Content - Fullscreen Camera */}
      <main className="flex-1 flex flex-col justify-center items-center w-full h-full p-0 m-0">
        {/* Camera Error Display */}
        {cameraError && (
          <div className="absolute top-0 left-0 w-full bg-red-50 border-b border-red-200 z-50 p-4">
            <div className="flex items-center">
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
              <span className="ml-3 text-sm font-medium text-red-800">
                {cameraError}
              </span>
            </div>
          </div>
        )}

        {/* Camera Section - Fullscreen */}
        <div
          className="relative w-full h-full flex-1 flex items-center justify-center bg-black"
          onClick={handleScreenTap}
        >
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Face positioning guide overlay */}
            {/* <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-48 h-60 border-4 border-blue-400 rounded-2xl border-dashed opacity-80 shadow-lg"></div>
              </div> */}
            {/* Corner guides */}
            <div className="absolute top-6 left-6 w-8 h-8 border-l-4 border-t-4 border-blue-400 opacity-80"></div>
            <div className="absolute top-6 right-6 w-8 h-8 border-r-4 border-t-4 border-blue-400 opacity-80"></div>
            <div className="absolute bottom-6 left-6 w-8 h-8 border-l-4 border-b-4 border-blue-400 opacity-80"></div>
            <div className="absolute bottom-6 right-6 w-8 h-8 border-r-4 border-b-4 border-blue-400 opacity-80"></div>
          </div>
          <MobileWebcam
            ref={webcamRef}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
          />

          {/* Fullscreen Matched Frame Confirmation Dialog (restored to conditional rendering) */}
          {isMatchedFrameVisible && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm pointer-events-auto z-50">
              <div className="bg-white rounded-2xl p-6 w-11/12 max-w-xs mx-auto flex flex-col items-center shadow-2xl">
                <img
                  src={matchedFrame}
                  alt="Matched Face"
                  className="w-32 h-32 rounded-full border-4 border-green-400 shadow-lg object-cover mb-4"
                  onError={(e) => {
                    // Fallback to a default image if the employee image fails to load
                    e.currentTarget.src = "/employee2.jpg";
                  }}
                />
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-6 h-6 text-green-500"
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
                  <span className="text-green-600 font-bold text-lg">
                    Attendance Marked
                  </span>
                </div>
                <p className="text-xl font-semibold text-gray-900 mb-1">
                  {(recognizedEmployee && recognizedEmployee.name) ||
                    "Test User"}
                </p>
                <p className="text-gray-600 text-sm mb-2">
                  Welcome! Your attendance has been recorded.
                </p>
                {countdown > 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    Closing in {countdown} seconds...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu Overlay */}
          {showMenu && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-11/12 max-w-sm mx-auto shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
                  <button
                    onClick={handleCloseMenu}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleAddNewFace}
                    className="w-full bg-orange-500 hover:bg-orange-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span>Add New Face</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
