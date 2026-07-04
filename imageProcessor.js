const sharp = require('sharp');

// Process image based on chosen action
async function processImage(buffer, action) {
  let pipeline = sharp(buffer);

  switch (action) {
    case 'flip_h':
      // Mirror left to right
      pipeline = pipeline.flop();
      break;
    case 'flip_v':
      // Mirror top to bottom
      pipeline = pipeline.flip();
      break;
    case 'rotate_90':
      pipeline = pipeline.rotate(90);
      break;
    case 'rotate_180':
      pipeline = pipeline.rotate(180);
      break;
    case 'rotate_270':
      pipeline = pipeline.rotate(270);
      break;
    default:
      throw new Error('Unknown action: ' + action);
  }

  return await pipeline.toBuffer();
}

module.exports = { processImage };
