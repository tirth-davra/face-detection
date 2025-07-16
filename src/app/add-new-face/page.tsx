"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import MobileWebcam from "../../components/MobileWebcam";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

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

export default function AddNewFace() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState("");

  // Camera permission states
  const [cameraPermission, setCameraPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [cameraError, setCameraError] = useState<string>("");

  // Check admin status on component mount
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      router.replace("/login");
    }
  }, [router]);

  // Camera permission handlers
  const handleCameraPermissionGranted = () => {
    setCameraPermission("granted");
    setCameraError("");
  };

  const handleCameraPermissionDenied = () => {
    setCameraPermission("denied");
    setCameraError("Camera access is required for face capture");
  };

  const handleUserMedia = () => {
    setCameraError("");
  };

  const handleUserMediaError = (error: string | DOMException) => {
    setCameraError(typeof error === "string" ? error : error.message);
    setCameraPermission("denied");
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = EMPLOYEES.find((emp) => emp.id === parseInt(employeeId));
    setSelectedEmployee(employee || null);
    setCapturedImage(null);
    setStatus("");
  };

  // Handle image capture
  const handleCapture = () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setIsCapturing(false);
      setStatus("Image captured successfully!");
    }
  };

  // Handle save
  const handleSave = () => {
    if (!selectedEmployee || !capturedImage) {
      setStatus("Please select an employee and capture an image first.");
      return;
    }

    // TODO: Implement save functionality
    // This would typically involve:
    // 1. Processing the captured image with face-api
    // 2. Generating face descriptor
    // 3. Saving to database
    // 4. Updating the employee's face data

    setStatus("Face data saved successfully!");

    // Redirect back to main page after a delay
    setTimeout(() => {
      router.replace("/");
    }, 2000);
  };

  // Handle back to main page
  const handleBack = () => {
    router.replace("/");
  };

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 min-h-screen bg-[#f4f8fb] flex flex-col">
        {/* Header - Mobile Style */}
        <div className="bg-white shadow-sm p-4 z-10">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Add New Face
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* Status Message */}
          {status && (
            <div
              className={`p-3 rounded-lg text-sm ${
                status.includes("successfully")
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              {status}
            </div>
          )}

          {/* Camera Error Display */}
          {cameraError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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

          {/* Employee Selection */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee?.id || ""}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg outline-0 bg-white text-gray-900 text-base"
            >
              <option value="" className="text-gray-500 bg-white">
                Choose an employee...
              </option>
              {EMPLOYEES.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                  className="text-gray-900 bg-white hover:bg-gray-100"
                >
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Section - Large and Responsive */}
          {selectedEmployee && (
            <div className=" rounded-lg p-4 flex-1 flex flex-col">
              {/* <h2 className="text-lg font-medium text-gray-900 mb-4">
                Capture Face for {selectedEmployee.name}
              </h2> */}

              {/* Camera Container - Responsive */}
              <div className="relative w-full flex-1 min-h-[400px] md:min-h-[500px] lg:min-h-[600px] bg-black rounded-lg overflow-hidden mb-4">
                <MobileWebcam
                  ref={webcamRef}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                />

                {/* Camera overlay guides */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner guides */}
                  <div className="absolute top-4 left-4 w-6 h-6 md:w-8 md:h-8 border-l-4 border-t-4 border-blue-400 opacity-80"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 md:w-8 md:h-8 border-r-4 border-t-4 border-blue-400 opacity-80"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 md:w-8 md:h-8 border-l-4 border-b-4 border-blue-400 opacity-80"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 md:w-8 md:h-8 border-r-4 border-b-4 border-blue-400 opacity-80"></div>
                </div>
              </div>

              {/* Action Buttons - Responsive */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCapture}
                  disabled={!selectedEmployee}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
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
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Capture Image</span>
                </button>

                {/* {capturedImage && (
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Save Face Data</span>
                  </button>
                )} */}
              </div>

              {/* Captured Image Preview */}
              {/* {capturedImage && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Captured Image Preview:
                  </h3>
                  <div className="flex justify-center">
                    <img
                      src={capturedImage}
                      alt="Captured Face"
                      className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-green-400 shadow-lg object-cover"
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <button
                      onClick={() => setCapturedImage(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Retake Photo
                    </button>
                  </div>
                </div>
              )} */}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
