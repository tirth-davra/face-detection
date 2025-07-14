"use client";
import Webcam from "react-webcam";
import { forwardRef, useState, useEffect } from "react";

interface MobileWebcamProps {
  onUserMedia?: () => void;
  onUserMediaError?: (error: string | DOMException) => void;
}

const MobileWebcam = forwardRef<Webcam, MobileWebcamProps>(
  ({ onUserMedia, onUserMediaError }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const videoConstraints = {
      facingMode: "user", // Front camera for face detection
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 30, min: 15 },
      aspectRatio: { ideal: 16/9 },
    };

    const handleUserMedia = () => {
      setIsLoading(false);
      setHasError(false);
      onUserMedia?.();
    };

    const handleUserMediaError = (error: string | DOMException) => {
      setIsLoading(false);
      setHasError(true);
      onUserMediaError?.(error);
    };

    useEffect(() => {
      // Reset loading state when component mounts
      setIsLoading(true);
      setHasError(false);
    }, []);

    return (
      <div className="camera-container relative w-full h-full">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Initializing camera...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 text-sm font-medium mb-2">Camera Error</p>
              <p className="text-gray-600 text-xs">Please check camera permissions</p>
            </div>
          </div>
        )}

        {/* Webcam Component */}
        <Webcam
          ref={ref}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.8}
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          className="w-full h-full object-cover"
          style={{
            display: isLoading || hasError ? 'none' : 'block'
          }}
          mirrored={true}
        />

        {/* Camera Frame Border */}
        {!isLoading && !hasError && (
          <div className="absolute inset-0 border-2 border-gray-300 rounded-lg pointer-events-none">
            {/* Optional: Add camera frame styling */}
          </div>
        )}
      </div>
    );
  }
);

MobileWebcam.displayName = 'MobileWebcam';

export default MobileWebcam; 