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

  useEffect(() => {
    checkCameraPermission();
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
    } catch (error: any) {
      console.error('Camera permission denied:', error);
      setError(error.message || 'Camera access denied');
      setPermissionStatus('denied');
      onPermissionDenied();
    }
  };

  if (permissionStatus === 'granted') {
    return null; // Don't render anything if permission is granted
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Camera Access Required
            </h3>
            <p className="text-gray-600 mb-4">
              This app needs camera access for face recognition. Your privacy is protected - no images are stored.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-700 text-sm">
              Camera access was denied. Please enable camera permissions in your browser settings and refresh the page.
            </div>
          )}

          <button
            onClick={requestCameraPermission}
            disabled={permissionStatus === 'denied'}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              permissionStatus === 'denied'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {permissionStatus === 'denied' ? 'Permission Denied' : 'Allow Camera Access'}
          </button>

          {permissionStatus === 'denied' && (
            <button
              onClick={() => window.location.reload()}
              className="w-full mt-2 py-2 px-4 text-blue-600 hover:text-blue-800 transition-colors"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 