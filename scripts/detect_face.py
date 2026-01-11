
import cv2
import mediapipe as mp
import sys
import json

def detect_face(video_path, start_time=0.0, duration=None):
    mp_face_detection = mp.solutions.face_detection
    
    # Initialize MediaPipe Face Detection
    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(json.dumps({"error": "Video could not be opened"}))
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)

        # Seek to start time
        if start_time > 0:
            cap.set(cv2.CAP_PROP_POS_MSEC, start_time * 1000)

        faces_x = []
        frame_count = 0
        
        # Calculate max frames to process
        max_frames = int(duration * fps) if duration else float('inf')

        # We don't need to process every single frame for crop stability. 
        # Processing every 10th frame is enough for finding a stable center.
        skip_frames = 10 
        face_detected_ever = False

        while cap.isOpened():
            if frame_count > max_frames:
                break

            success, image = cap.read()
            if not success:
                break
            
            if frame_count % skip_frames == 0:
                # Convert the BGR image to RGB
                image.flags.writeable = False
                try:
                    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                    results = face_detection.process(image)

                    if results.detections:
                        face_detected_ever = True
                        # Get the first face found
                        detection = results.detections[0]
                        bboxC = detection.location_data.relative_bounding_box
                        
                        # Calculate center x of the face (0.0 to 1.0)
                        center_x = bboxC.xmin + (bboxC.width / 2)
                        faces_x.append(center_x)
                    else:
                        # If no face, don't append anything or append last known?
                        # Using last known helps stability.
                        if faces_x:
                            faces_x.append(faces_x[-1])
                except Exception:
                    pass

            frame_count += 1

        cap.release()

        # Calculate average face position
        if faces_x:
            avg_x = sum(faces_x) / len(faces_x)
        else:
            avg_x = 0.5

        # Output the result JSON
        result = {
            "width": width,
            "height": height,
            "avg_x": avg_x,
            "fps": fps,
            "found": face_detected_ever
        }
        print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video path argument missing"}))
    else:
        video_path = sys.argv[1]
        start_time = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
        duration = float(sys.argv[3]) if len(sys.argv) > 3 else None
        detect_face(video_path, start_time, duration)
