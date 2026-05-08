const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function compressImages() {
  const assetsDir = 'c:/Users/dinas/OneDrive/Desktop/kode/mobile-app/assets/images';

  // 1. Main App Icon — JPEG 80% (much smaller, Android/iOS both support)
  const iconSource = 'C:/Users/dinas/Downloads/Gemini_Generated_Image_o2uppmo2uppmo2up.png';
  const iconOutput = path.join(assetsDir, 'icon.jpg');
  await sharp(iconSource)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .jpeg({ quality: 80, progressive: true })
    .toFile(iconOutput);
  const iconStat = fs.statSync(iconOutput);
  console.log(`icon.jpg: ${Math.round(iconStat.size/1024)}KB (was 631KB PNG)`);

  // 2. Adaptive Icon Foreground — PNG compressed (needs transparency if any)
  // Try PNG first; if too large, use JPEG with white bg
  const fgOutput = path.join(assetsDir, 'android-icon-foreground.png');
  const fgResult = await sharp(iconSource)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(fgOutput);
  const fgStat = fs.statSync(fgOutput);
  console.log(`android-icon-foreground.png: ${Math.round(fgStat.size/1024)}KB`);

  // If PNG foreground is >200KB, try JPEG fallback
  if (fgStat.size > 200 * 1024) {
    const fgJpg = path.join(assetsDir, 'android-icon-foreground.jpg');
    await sharp(iconSource)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .jpeg({ quality: 85, progressive: true })
      .toFile(fgJpg);
    const fgJpgStat = fs.statSync(fgJpg);
    console.log(`android-icon-foreground.jpg (fallback): ${Math.round(fgJpgStat.size/1024)}KB`);
    // Use jpg version instead
    fs.unlinkSync(fgOutput);
    fs.renameSync(fgJpg, fgOutput);
    const newStat = fs.statSync(fgOutput);
    console.log(`android-icon-foreground (final): ${Math.round(newStat.size/1024)}KB`);
  }

  // 3. Splash Icon — PNG compressed, 400px
  const splashSource = 'C:/Users/dinas/Downloads/Gemini_Generated_Image_4q9nn84q9nn84q9n.png';
  const splashOutput = path.join(assetsDir, 'splash-icon.png');
  await sharp(splashSource)
    .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(splashOutput);
  const splashStat = fs.statSync(splashOutput);
  console.log(`splash-icon.png: ${Math.round(splashStat.size/1024)}KB (was 631KB PNG)`);

  // 4. Splash Icon JPEG fallback if PNG >200KB
  if (splashStat.size > 200 * 1024) {
    const splashJpg = path.join(assetsDir, 'splash-icon.jpg');
    await sharp(splashSource)
      .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .jpeg({ quality: 85, progressive: true })
      .toFile(splashJpg);
    const splashJpgStat = fs.statSync(splashJpg);
    console.log(`splash-icon.jpg: ${Math.round(splashJpgStat.size/1024)}KB (JPEG fallback)`);
  }

  console.log('\nAll images processed!');
}

compressImages().catch(console.error);
