from PIL import Image
import sys
import os

def remove_black_background(input_path, output_path):
    print(f"Opening image: {input_path}")
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # Check if pixel is close to black
            # Tolerans artırıldı (50) ki koyu gri kenarlar da gitsin
            if item[0] < 50 and item[1] < 50 and item[2] < 50:
                new_data.append((0, 0, 0, 0)) # Tam şeffaf
            else:
                # Orijinal rengi koru
                new_data.append(item)
                
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Saved transparent image to: {output_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input> <output>")
        sys.exit(1)
        
    remove_black_background(sys.argv[1], sys.argv[2])
