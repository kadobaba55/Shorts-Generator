#!/usr/bin/env python3
"""
Whisper transcription script for subtitle editing.
Generates JSON output for frontend editor.
Usage: python transcribe_json.py <audio_path> --model <model> --language <lang>
"""

import argparse
import json
import sys
import os

def create_word_synced_segments(segments, max_words_per_line=4, max_duration=2.5):
    """
    Create segments that sync better with speech by limiting words per line.
    Uses faster-whisper segments which can contain word details if available.
    """
    segments_data = []
    current_id = 1
    
    for segment in segments:
        words = segment.words if segment.words else []
        
        # If no word timestamps, fallback to text splitting
        if not words:
            text = segment.text.strip()
            text_words = text.split()
            if not text_words:
                continue
                
            # Simple interpolation fallback
            segment_duration = segment.end - segment.start
            time_per_word = segment_duration / len(text_words)
            
            for i in range(0, len(text_words), max_words_per_line):
                chunk_words = text_words[i:i + max_words_per_line]
                chunk_text = ' '.join(chunk_words)
                chunk_start = segment.start + (i * time_per_word)
                chunk_end = min(segment.start + ((i + len(chunk_words)) * time_per_word), segment.end)
                
                if chunk_end - chunk_start < 0.5: chunk_end = chunk_start + 0.5
                
                segments_data.append({
                    "id": str(current_id),
                    "start": float(f"{chunk_start:.3f}"),
                    "end": float(f"{chunk_end:.3f}"),
                    "text": chunk_text
                })
                current_id += 1
            continue

        # Use actual word timestamps
        current_chunk = []
        chunk_start = words[0].start
        
        for word in words:
            current_chunk.append(word)
            
            # Check if chunk should end
            chunk_duration = word.end - chunk_start
            
            if len(current_chunk) >= max_words_per_line or chunk_duration >= max_duration:
                # Finalize chunk
                chunk_text = "".join([w.word for w in current_chunk]).strip()
                chunk_end = word.end
                
                segments_data.append({
                    "id": str(current_id),
                    "start": float(f"{chunk_start:.3f}"),
                    "end": float(f"{chunk_end:.3f}"),
                    "text": chunk_text
                })
                current_id += 1
                
                # Reset for next chunk
                current_chunk = []
                if word != words[-1]:
                    # Estimate next start slightly after current end
                    chunk_start = word.end 

        # Add remaining words
        if current_chunk:
            chunk_text = "".join([w.word for w in current_chunk]).strip()
            chunk_end = current_chunk[-1].end
            segments_data.append({
                "id": str(current_id),
                "start": float(f"{chunk_start:.3f}"),
                "end": float(f"{chunk_end:.3f}"),
                "text": chunk_text
            })
            current_id += 1

    return segments_data

def main():
    parser = argparse.ArgumentParser(description='Transcribe audio to JSON using faster-whisper')
    parser.add_argument('audio_path', help='Path to audio file')
    parser.add_argument('--model', default='medium', choices=['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3'], help='Whisper model to use')
    parser.add_argument('--language', default='tr', help='Language code')
    parser.add_argument('--words_per_line', type=int, default=4, help='Max words per subtitle line')
    parser.add_argument('--max_duration', type=float, default=2.5, help='Max duration per subtitle in seconds')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.audio_path):
        print(json.dumps({"error": f"Audio file not found: {args.audio_path}"}))
        sys.exit(1)
    
    try:
        from faster_whisper import WhisperModel
        
        # Use int8 quantization for CPU speed
        model = WhisperModel(args.model, device="cpu", compute_type="int8")
        
        segments, info = model.transcribe(
            args.audio_path,
            language=args.language,
            beam_size=5,
            word_timestamps=True 
        )
        
        # Convert generator to list immediately to process
        segments_list = list(segments)
        
        final_segments = create_word_synced_segments(
            segments_list, 
            max_words_per_line=args.words_per_line,
            max_duration=args.max_duration
        )
        
        print(json.dumps({
            "success": True,
            "language": info.language,
            "segments": final_segments
        }))
        
    except ImportError:
        print(json.dumps({"error": "faster_whisper module not found. Run: pip install faster-whisper"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
