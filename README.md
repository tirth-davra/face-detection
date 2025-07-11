# Face Recognition Web App

A Next.js web application that uses webcam to capture live images and compares them with a stored reference image using face-api.js.

## 🚀 Features

- **Live Webcam Capture**: Uses `react-webcam` to capture images from the browser
- **Face Recognition**: Compares captured faces with a reference image using face-api.js
- **Real-time Verification**: Shows match/no-match results with distance scores
- **Modern UI**: Clean, responsive interface built with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router) with React and TypeScript
- **Camera**: `react-webcam` for browser camera access
- **Face Recognition**: `@vladmandic/face-api` with TensorFlow.js (client-side)
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes (pass-through)

## 📦 Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Add your reference image:**
   - Add a clear photo named `known.jpg` to the `public/` folder
   - The image should show the person's face prominently
   - Supported formats: JPEG, PNG
   - This will be used as the reference for face comparison

3. **Start the development server:**
```bash
npm run dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Allow camera permissions when prompted

## 🎯 How to Use

1. **Capture**: Click the "Capture" button to take a photo from your webcam
2. **Verify**: Click "Verify Face" to compare the captured image with the reference
3. **Results**: View the match result and distance score

## 📁 Project Structure

```
face-detection/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI component
│   │   └── api/
│   │       └── verify/
│   │           └── route.js      # Face verification API
├── public/
│   ├── known.jpg                 # Reference face image
│   └── models/                   # Face-api.js model files
└── package.json
```

## 🔧 API Endpoints

### POST `/api/verify`
Compares a captured face image with the reference image.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}
```

**Response:**
```json
{
  "success": true,
  "isMatch": true,
  "distance": "0.3456",
  "threshold": 0.6,
  "message": "Face matched successfully!"
}
```

## ⚙️ Configuration

The app uses multiple accuracy levels for face matching:

- **Excellent Match**: Distance < 0.4 (very strict)
- **Good Match**: Distance < 0.5 (normal)
- **Fair Match**: Distance < 0.6 (loose)
- **No Match**: Distance ≥ 0.6

**Detection Settings:**
- **Input Size**: 512px (higher resolution for better accuracy)
- **Confidence Threshold**: 0.5 (higher confidence required)
- **Multiple Face Detection**: Prevents verification when multiple faces are detected

**Customization**: You can adjust these thresholds in the `FACE_RECOGNITION_CONFIG` object in `src/app/page.tsx`

## 🐛 Troubleshooting

1. **Camera not working**: Ensure browser permissions are granted
2. **No face detected**: Make sure the captured image shows a clear face
3. **Model loading errors**: Check that all model files are in `public/models/`
4. **Reference image issues**: Ensure `public/known.jpg` contains a clear face

## 📝 Notes

- **Client-Side Processing**: All face recognition happens in the browser using face-api.js
- **Model Loading**: Face recognition models are loaded on app startup
- **Reference Image**: The app loads and processes `public/known.jpg` as the reference face
- **Privacy**: All processing happens locally in the browser, no images sent to server
- **Accuracy**: Face recognition accuracy depends on image quality and lighting
- **Distance Threshold**: Set to 0.6 (lower distance = more similar faces)
- **Browser Support**: Requires modern browsers with WebGL support

## 🔒 Privacy

- All face processing happens locally in the browser
- No face data is sent to the server
- Images are processed in memory only
- No data is stored permanently
