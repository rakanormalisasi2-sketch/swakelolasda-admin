from PIL import Image

img_path = r"C:\Users\dinas\Downloads\Gemini_Generated_Image_m2gpbjm2gpbjm2gp (3).png"
img = Image.open(img_path).convert("RGBA")
width, height = img.size
center_x, center_y = width // 2, height // 2
pixels = img.load()

print("Image size: {}x{}".format(width, height))

top_y = None
for y in range(center_y, 0, -1):
    r,g,b,a = pixels[center_x, y]
    if r < 50 and g < 100 and b < 150: # Dark blue
        top_y = y
        break

bottom_y = None
for y in range(center_y, height):
    r,g,b,a = pixels[center_x, y]
    if r < 50 and g < 100 and b < 150:
        bottom_y = y
        break

left_x = None
for x in range(center_x, 0, -1):
    r,g,b,a = pixels[x, center_y]
    if r < 50 and g < 100 and b < 150:
        left_x = x
        break

right_x = None
for x in range(center_x, width):
    r,g,b,a = pixels[x, center_y]
    if r < 50 and g < 100 and b < 150:
        right_x = x
        break

print("Bounds: top={}, bottom={}, left={}, right={}".format(top_y, bottom_y, left_x, right_x))

if top_y and bottom_y and left_x and right_x:
    radius_y = (bottom_y - top_y) / 2
    radius_x = (right_x - left_x) / 2
    print("Radius X: {}, Radius Y: {}".format(radius_x, radius_y))
