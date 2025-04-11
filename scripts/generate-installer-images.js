import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Constants for NSIS bitmap dimensions
const HEADER_WIDTH = 150;
const HEADER_HEIGHT = 57;
const SIDEBAR_WIDTH = 164;
const SIDEBAR_HEIGHT = 314;

// Create header bitmap
function createHeaderBitmap() {
  const canvas = createCanvas(HEADER_WIDTH, HEADER_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, HEADER_WIDTH, HEADER_HEIGHT);
  gradient.addColorStop(0, '#0f172a');  // slate-900
  gradient.addColorStop(1, '#1e293b');  // slate-800
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, HEADER_WIDTH, HEADER_HEIGHT);

  // Add decorative heart
  ctx.save();
  ctx.translate(HEADER_WIDTH - 40, HEADER_HEIGHT/2);
  ctx.scale(0.8, 0.8);
  
  // Heart shape path
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-8, 0, -25, 0, -25, 15);
  ctx.bezierCurveTo(-25, 25, -8, 35, 0, 40);
  ctx.bezierCurveTo(8, 35, 25, 25, 25, 15);
  ctx.bezierCurveTo(25, 0, 8, 0, 0, 10);
  
  // Create heart gradient
  const heartGradient = ctx.createLinearGradient(-25, 0, 25, 40);
  heartGradient.addColorStop(0, '#ec4899');  // pink-500
  heartGradient.addColorStop(1, '#ef4444');  // red-500
  ctx.fillStyle = heartGradient;
  ctx.fill();
  ctx.restore();

  // Add text with gradient
  const textGradient = ctx.createLinearGradient(10, 0, 10, HEADER_HEIGHT);
  textGradient.addColorStop(0, '#ec4899');  // pink-500
  textGradient.addColorStop(1, '#ef4444');  // red-500
  
  ctx.fillStyle = textGradient;
  ctx.font = 'bold 22px Arial';
  ctx.fillText('Heart Touch', 10, 25);
  ctx.font = '18px Arial';
  ctx.fillText('Lamp', 10, 45);

  return canvas.toBuffer('image/bmp');
}

// Create sidebar bitmap
function createSidebarBitmap() {
  const canvas = createCanvas(SIDEBAR_WIDTH, SIDEBAR_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, SIDEBAR_HEIGHT);
  gradient.addColorStop(0, '#0f172a');  // slate-900
  gradient.addColorStop(1, '#1e293b');  // slate-800
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIDEBAR_WIDTH, SIDEBAR_HEIGHT);

  // Add decorative elements
  const centerX = SIDEBAR_WIDTH/2;
  const centerY = SIDEBAR_HEIGHT/2 - 40;

  // Draw glowing circle
  const glowGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, 60
  );
  glowGradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)');  // pink-500
  glowGradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
  ctx.fill();

  // Draw heart
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(1.5, 1.5);
  
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-8, 0, -25, 0, -25, 15);
  ctx.bezierCurveTo(-25, 25, -8, 35, 0, 40);
  ctx.bezierCurveTo(8, 35, 25, 25, 25, 15);
  ctx.bezierCurveTo(25, 0, 8, 0, 0, 10);
  
  const heartGradient = ctx.createLinearGradient(-25, 0, 25, 40);
  heartGradient.addColorStop(0, '#ec4899');  // pink-500
  heartGradient.addColorStop(1, '#ef4444');  // red-500
  ctx.fillStyle = heartGradient;
  ctx.fill();
  ctx.restore();

  // Add text with gradient background
  const textY = SIDEBAR_HEIGHT - 80;
  const textHeight = 50;
  const textBgGradient = ctx.createLinearGradient(0, textY, 0, textY + textHeight);
  textBgGradient.addColorStop(0, 'rgba(15, 23, 42, 0)');  // slate-900 transparent
  textBgGradient.addColorStop(1, 'rgba(15, 23, 42, 0.8)');  // slate-900 semi-transparent
  ctx.fillStyle = textBgGradient;
  ctx.fillRect(0, textY, SIDEBAR_WIDTH, textHeight);

  // Add text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Heart Touch Lamp', centerX, SIDEBAR_HEIGHT - 50);
  
  // Add subtitle with gradient
  const subtitleGradient = ctx.createLinearGradient(
    centerX - 50, SIDEBAR_HEIGHT - 30,
    centerX + 50, SIDEBAR_HEIGHT - 30
  );
  subtitleGradient.addColorStop(0, '#ec4899');  // pink-500
  subtitleGradient.addColorStop(1, '#ef4444');  // red-500
  ctx.fillStyle = subtitleGradient;
  ctx.font = '16px Arial';
  ctx.fillText('Connecting People', centerX, SIDEBAR_HEIGHT - 30);

  return canvas.toBuffer('image/bmp');
}

// Save the bitmaps
try {
  writeFileSync(join(process.cwd(), 'public/installer-header.bmp'), createHeaderBitmap());
  writeFileSync(join(process.cwd(), 'public/installer-sidebar.bmp'), createSidebarBitmap());
  console.log('Successfully generated installer bitmaps');
} catch (error) {
  console.error('Error generating bitmaps:', error);
  process.exit(1);
}