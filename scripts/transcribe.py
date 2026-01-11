#!/usr/bin/env python3
"""
Whisper transcription script for subtitle generation.
Generates word-synced subtitles for better timing.
Usage: python transcribe.py <audio_path> --model <model> --language <lang> --output <output_path>
"""

import argparse
import json
import sys
import os

def format_timestamp(seconds):
    """Format seconds to SRT timestamp format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"

def create_word_synced_subtitles(result, max_words_per_line=4, max_duration=2.5):
    """
    Create subtitles that sync better with speech by limiting words per line
    and ensuring shorter display duration.
    """
    srt_content = []
    subtitle_index = 1
    
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
            
            start_ts = format_timestamp(chunk_start)
            end_ts = format_timestamp(chunk_end)
            
            srt_content.append(f"{subtitle_index}")
            srt_content.append(f"{start_ts} --> {end_ts}")
            srt_content.append(chunk_text)
            srt_content.append("")
            
            subtitle_index += 1
    
    return '\n'.join(srt_content)

def main():
    parser = argparse.ArgumentParser(description='Transcribe audio using Whisper')
    parser.add_argument('audio_path', help='Path to audio file')
    parser.add_argument('--model', default='tiny', choices=['tiny', 'base', 'small', 'medium', 'large'], help='Whisper model to use')
    parser.add_argument('--language', default='tr', help='Language code')
    parser.add_argument('--output', required=True, help='Output SRT file path')
    parser.add_argument('--words_per_line', type=int, default=4, help='Max words per subtitle line')
    parser.add_argument('--max_duration', type=float, default=2.5, help='Max duration per subtitle in seconds')
    
    args = parser.parse_args()
    
    # Check if audio file exists
    if not os.path.exists(args.audio_path):
        print(f"Error: Audio file not found: {args.audio_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        import whisper
        print(f"Loading Whisper model: {args.model}", file=sys.stderr)
        model = whisper.load_model(args.model)
        
        print(f"Transcribing: {args.audio_path}", file=sys.stderr)
        result = model.transcribe(
            args.audio_path,
            language=args.language,
            verbose=False
        )
        
        # Generate word-synced SRT
        srt_content = create_word_synced_subtitles(
            result, 
            max_words_per_line=args.words_per_line,
            max_duration=args.max_duration
        )
        
        # Write output
        output_dir = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(srt_content)
        
        print(f"SRT saved to: {args.output}", file=sys.stderr)
        
        # Output JSON for potential parsing
        output_data = {
            'success': True,
            'language': result.get('language', args.language),
            'segments': len(result['segments']),
            'output_path': args.output
        }
        print(json.dumps(output_data))
        
    except ImportError:
        print("Error: Whisper not installed. Run: pip install openai-whisper", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
