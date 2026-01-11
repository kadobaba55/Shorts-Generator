try:
    import cv2
    import mediapipe
    print("success")
except ImportError as e:
    print(f"error: {e}")
