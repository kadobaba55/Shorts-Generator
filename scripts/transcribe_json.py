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

def create_word_synced_segments(result, max_words_per_line=4, max_duration=2.5):
    """
    Create segments that sync better with speech by limiting words per line.
    Returns list of distinct subtitle segments.
    """
    segments_data = []
    current_id = 1
    
    for segment in result['segments']:
        text = segment['text'].strip()
        words = text.split()
        
        if not words:
            continue
        
        # Calculate timing per word
        segment_duration = segment['end'] - segment['start']
        time_per_word = segment_duration / len(words) if words else 0
        
        # Split into chunks of max_words_per_line words
        for i in range(0, len(words), max_words_per_line):
            chunk_words = words[i:i + max_words_per_line]
            chunk_text = ' '.join(chunk_words)
            
            # Calculate start and end times for this chunk
            chunk_start = segment['start'] + (i * time_per_word)
            chunk_end = min(
                segment['start'] + ((i + len(chunk_words)) * time_per_word),
                segment['end']
            )
            
            # Ensure minimum display time (0.5s)
            if chunk_end - chunk_start < 0.5:
                chunk_end = chunk_start + 0.5
            
            # Cap maximum duration
            if chunk_end - chunk_start > max_duration:
                chunk_end = chunk_start + max_duration
            
            segments_data.append({
                "id": str(current_id),
                "start": float(f"{chunk_start:.3f}"),
                "end": float(f"{chunk_end:.3f}"),
                "text": chunk_text
            })
            
            current_id += 1
    
    return segments_data

def main():
    parser = argparse.ArgumentParser(description='Transcribe audio to JSON using Whisper')
    parser.add_argument('audio_path', help='Path to audio file')
    parser.add_argument('--model', default='tiny', choices=['tiny', 'base', 'small', 'medium', 'large'], help='Whisper model to use')
    parser.add_argument('--language', default='tr', help='Language code')
    parser.add_argument('--words_per_line', type=int, default=4, help='Max words per subtitle line')
    parser.add_argument('--max_duration', type=float, default=2.5, help='Max duration per subtitle in seconds')
    
    args = parser.parse_args()
    
    # Check if audio file exists
    if not os.path.exists(args.audio_path):
        print(json.dumps({"error": f"Audio file not found: {args.audio_path}"}))
        sys.exit(1)
    
    try:
        # Suppress warnings
        import warnings
        warnings.filterwarnings("ignore")
        
        import whisper
        
        # Load model quietly
        model = whisper.load_model(args.model)
        
        result = model.transcribe(
            args.audio_path,
            language=args.language,
            verbose=False,
            fp16=False # CPU compatibility
        )
        
        # Generate segments
        segments = create_word_synced_segments(
            result, 
            max_words_per_line=args.words_per_line,
            max_duration=args.max_duration
        )
        
        # Output JSON to stdout
        print(json.dumps({
            "success": True,
            "language": result.get('language', args.language),
            "segments": segments
        }))
        
    except ImportError:
        print(json.dumps({"error": "Whisper not installed"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
