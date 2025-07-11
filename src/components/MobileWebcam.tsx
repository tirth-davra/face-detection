"use client";
import Webcam from "react-webcam";
import { forwardRef } from "react";

interface MobileWebcamProps {
  onUserMedia?: () => void;
  onUserMediaError?: (error: string | DOMException) => void;
}

const MobileWebcam = forwardRef<Webcam, MobileWebcamProps>(
  ({ onUserMedia, onUserMediaError }, ref) => {
    const videoConstraints = {
      facingMode: "user", // Front camera for face detection
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 30, min: 15 },
      // Additional mobile optimizations
      aspectRatio: { ideal: 4/3 },
    };

    return (
      <div className="camera-container relative">
        <Webcam
          ref={ref}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.8}
          width={320}
          height={240}
          videoConstraints={videoConstraints}
          onUserMedia={onUserMedia}
          onUserMediaError={onUserMediaError}
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: '320px',
            objectFit: 'cover'
          }}
        />
      </div>
    );
  }
);

MobileWebcam.displayName = 'MobileWebcam';

export default MobileWebcam; 