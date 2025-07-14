"use client";
import { useState, useEffect } from 'react';

interface CameraPermissionsProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export default function CameraPermissions({ 
  onPermissionGranted, 
  onPermissionDenied 
}: CameraPermissionsProps) {
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied' | 'prompt'>('pending');
  const [error, setError] = useState<string>('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkCameraPermission();
    // Add a slight delay to show the modal with animation
    const timer = setTimeout(() => setShowModal(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const checkCameraPermission = async () => {
    try {
      // Check if navigator.permissions is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionStatus(permission.state);
        
        if (permission.state === 'granted') {
          onPermissionGranted();
        } else if (permission.state === 'denied') {
          onPermissionDenied();
        }
        
        // Listen for permission changes
        permission.onchange = () => {
          setPermissionStatus(permission.state);
          if (permission.state === 'granted') {
            onPermissionGranted();
          } else if (permission.state === 'denied') {
            onPermissionDenied();
          }
        };
      } else {
        // Fallback for browsers that don't support permissions API
        setPermissionStatus('prompt');
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setPermissionStatus('prompt');
    }
  };

  const requestCameraPermission = async () => {
    try {
      setError('');
      setIsRequesting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        } 
      });
      
      // Stop the stream immediately as we just needed to trigger permission
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionStatus('granted');
      onPermissionGranted();
    } catch (error: unknown) {
      console.error('Camera permission denied:', error);
      setError(error instanceof Error ? error.message : 'Camera access denied');
      setPermissionStatus('denied');
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (permissionStatus === 'granted') {
    return null; // Don't render anything if permission is granted
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
      showModal ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${
        showModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      }`}>
        <div className="p-8">
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Camera Access Required
            </h3>

            {/* Description */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              Enable camera access to use face recognition. Your privacy is protected - no images are stored or transmitted.
            </p>

            {/* Features */}
            <div className="text-left mb-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Real-time face detection</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Secure local processing</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">No data collection</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Permission Denied Warning */}
            {permissionStatus === 'denied' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Permission Denied</p>
                    <p className="text-xs text-yellow-700">
                      Please enable camera permissions in your browser settings and refresh the page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={requestCameraPermission}
                disabled={permissionStatus === 'denied' || isRequesting}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  permissionStatus === 'denied' || isRequesting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isRequesting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Requesting Access...</span>
                  </div>
                ) : permissionStatus === 'denied' ? (
                  'Permission Denied'
                ) : (
                  'Allow Camera Access'
                )}
              </button>

              {permissionStatus === 'denied' && (
                <button
                  onClick={handleRefresh}
                  className="w-full py-3 px-6 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 