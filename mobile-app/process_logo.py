import cv2
import numpy as np
from PIL import Image

# Path to the downloaded image
img_path = r"C:\Users\dinas\Downloads\Gemini_Generated_Image_m2gpbjm2gpbjm2gp (3).png"
output_dir = r"c:\Users\dinas\OneDrive\Desktop\kode\mobile-app\assets\images"

# Read image
img = cv2.imread(img_path)
if img is None:
    print("Error: Could not read image.")
    exit(1)

# Convert to grayscale for circle detection
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
# Apply some blur
gray_blur = cv2.medianBlur(gray, 5)

# Detect circles using HoughCircles
circles = cv2.HoughCircles(
    gray_blur, 
    cv2.HOUGH_GRADIENT, 
    dp=1, 
    minDist=100,
    param1=50, 
    param2=30, 
    minRadius=100, 
    maxRadius=400
)

if circles is not None:
    circles = np.uint16(np.around(circles))
    # Assuming the largest/most prominent circle is the logo
    # Sort circles by radius in descending order
    circles = sorted(circles[0, :], key=lambda x: x[2], reverse=True)
    best_circle = circles[0]
    
    center_x, center_y, radius = best_circle
    print("Found circle at ({}, {}) with radius {}".format(center_x, center_y, radius))
    
    # We want to crop slightly inside or exactly at the border
    # Crop a square region around the circle
    x1 = max(0, center_x - radius)
    y1 = max(0, center_y - radius)
    x2 = min(img.shape[1], center_x + radius)
    y2 = min(img.shape[0], center_y + radius)
    
    cropped = img[y1:y2, x1:x2]
    
    # Convert BGR to RGB
    cropped_rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
    
    # Convert to PIL Image
    pil_img = Image.fromarray(cropped_rgb)
    
    # Resize / Scale up to 1024x1024 using Lanczos (high quality)
    target_size = (1024, 1024)
    pil_img = pil_img.resize(target_size, Image.Resampling.LANCZOS)
    
    # Create circular mask
    mask = Image.new('L', target_size, 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, target_size[0], target_size[1]), fill=255)
    
    # Apply mask
    output = Image.new('RGBA', target_size, (0, 0, 0, 0))
    output.paste(pil_img, (0, 0), mask)
    
    # Save the files
    import os
    output.save(os.path.join(output_dir, "icon.png"))
    output.save(os.path.join(output_dir, "splash-icon.png"))
    output.save(os.path.join(output_dir, "logo.png"))
    
    # Create a smaller version for favicon
    favicon = output.resize((192, 192), Image.Resampling.LANCZOS)
    favicon.save(os.path.join(output_dir, "favicon.png"))
    
    print("Logo successfully processed and saved to assets.")
else:
    print("No circle detected. Trying manual crop...")
    # Manual crop fallback assuming it's roughly centered
    h, w = img.shape[:2]
    center_y, center_x = h // 2, w // 2
    # Estimate radius based on typical image composition (e.g., 1/3 of min dimension)
    radius = int(min(h, w) * 0.35)
    
    x1 = max(0, center_x - radius)
    y1 = max(0, center_y - radius)
    x2 = min(img.shape[1], center_x + radius)
    y2 = min(img.shape[0], center_y + radius)
    
    cropped = img[y1:y2, x1:x2]
    cropped_rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(cropped_rgb)
    target_size = (1024, 1024)
    pil_img = pil_img.resize(target_size, Image.Resampling.LANCZOS)
    
    mask = Image.new('L', target_size, 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, target_size[0], target_size[1]), fill=255)
    
    output = Image.new('RGBA', target_size, (0, 0, 0, 0))
    output.paste(pil_img, (0, 0), mask)
    
    import os
    output.save(os.path.join(output_dir, "icon.png"))
    output.save(os.path.join(output_dir, "splash-icon.png"))
    output.save(os.path.join(output_dir, "logo.png"))
    
    favicon = output.resize((192, 192), Image.Resampling.LANCZOS)
    favicon.save(os.path.join(output_dir, "favicon.png"))
    print("Manual crop applied and saved.")
