# Public Folder

## Reference Image Setup

To use the face recognition app, you need to add a reference image:

1. **Add your reference image**: Place a clear photo named `known.jpg` in this folder
2. **Image requirements**:
   - Format: JPEG or PNG
   - Content: Clear photo of a person's face
   - Size: Recommended 300x300 pixels or larger
   - Quality: Good lighting, face clearly visible

## Example:
```
public/
├── known.jpg          # Your reference face image
├── models/            # Face-api.js model files
└── README.md          # This file
```

**Note**: The app will automatically load and process this image when it starts up. 