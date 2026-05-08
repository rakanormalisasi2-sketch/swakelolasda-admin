from PIL import Image, ImageDraw
import sys, os

def process_logo():
    img_path = r"C:\Users\dinas\Downloads\Gemini_Generated_Image_m2gpbjm2gpbjm2gp (3).png"
    output_dir = r"c:\Users\dinas\OneDrive\Desktop\kode\mobile-app\assets\images"
    
    if not os.path.exists(img_path):
        print("Image not found: " + img_path)
        return
        
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    print("Original size:", width, "x", height)
    
    # Calculate crop box
    # Assuming the circle is about 75% of the height
    # Let's crop a square from the center.
    # The circle radius is roughly 35-40% of the height based on visual estimation.
    # We will crop a square of size `crop_size` from the center
    crop_size = int(height * 0.8) # Adjust this if the circle gets cut off
    
    left = (width - crop_size) // 2
    top = (height - crop_size) // 2
    right = left + crop_size
    bottom = top + crop_size
    
    cropped = img.crop((left, top, right, bottom))
    print("Cropped size:", cropped.size)
    
    # Scale up to 1024x1024
    target_size = (1024, 1024)
    scaled = cropped.resize(target_size, Image.LANCZOS if hasattr(Image, 'LANCZOS') else Image.ANTIALIAS)
    
    # Create circular mask
    mask = Image.new('L', target_size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, target_size[0], target_size[1]), fill=255)
    
    # Apply mask
    output = Image.new('RGBA', target_size, (0, 0, 0, 0))
    output.paste(scaled, (0, 0), mask)
    
    # Save files
    os.makedirs(output_dir, exist_ok=True)
    output.save(os.path.join(output_dir, "icon.png"))
    output.save(os.path.join(output_dir, "splash-icon.png"))
    output.save(os.path.join(output_dir, "logo.png"))
    
    favicon = output.resize((192, 192), Image.LANCZOS if hasattr(Image, 'LANCZOS') else Image.ANTIALIAS)
    favicon.save(os.path.join(output_dir, "favicon.png"))
    
    print("Logo successfully processed and saved to assets/images!")

if __name__ == '__main__':
    process_logo()
