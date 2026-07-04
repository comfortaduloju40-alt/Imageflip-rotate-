require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { saveImage, getImage } = require('./sessions');
const { processImage } = require('./imageProcessor');

// Webhook mode — no polling
const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// Action labels for captions
const ACTION_LABELS = {
  flip_h: '↔️ Flipped Horizontally',
  flip_v: '↕️ Flipped Vertically',
  rotate_90: '↩️ Rotated 90°',
  rotate_180: '🔄 Rotated 180°',
  rotate_270: '↪️ Rotated 270°'
};

// Inline keyboard shown after every photo
function getKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '↔️ Flip Horizontal', callback_data: 'flip_h' },
        { text: '↕️ Flip Vertical', callback_data: 'flip_v' }
      ],
      [
        { text: '↩️ Rotate 90°', callback_data: 'rotate_90' },
        { text: '🔄 Rotate 180°', callback_data: 'rotate_180' }
      ],
      [
        { text: '↪️ Rotate 270°', callback_data: 'rotate_270' }
      ]
    ]
  };
}

// ─── /start ──────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'there';

  bot.sendMessage(
    chatId,
    `👋 Hello, ${name}!\n\n` +
    `I'm your *Image Flip & Rotate Bot*! 🖼️\n\n` +
    `*How it works:*\n` +
    `1. Send me any photo\n` +
    `2. Tap an action button\n` +
    `3. Get your edited image instantly!\n\n` +
    `*Commands:*\n` +
    `❓ /help — How to use this bot\n\n` +
    `📸 Send me a photo to get started!`,
    { parse_mode: 'Markdown' }
  );
});

// ─── /help ───────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `❓ *How to Use Image Flip & Rotate Bot*\n\n` +
    `1️⃣ Send me any image\n` +
    `2️⃣ Tap one of the action buttons:\n\n` +
    `↔️ *Flip Horizontal* — Mirror left to right\n` +
    `↕️ *Flip Vertical* — Mirror top to bottom\n` +
    `↩️ *Rotate 90°* — Turn clockwise once\n` +
    `🔄 *Rotate 180°* — Flip upside down\n` +
    `↪️ *Rotate 270°* — Turn anti-clockwise\n\n` +
    `💡 _Tip: Send a new photo anytime to start fresh!_`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Handle photo messages ────────────────────────────
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;

  // Telegram sends multiple sizes — pick the largest (best quality)
  const photo = msg.photo[msg.photo.length - 1];
  saveImage(chatId, photo.file_id);

  bot.sendMessage(
    chatId,
    '🖼️ *Photo received!*\n\nChoose an action:',
    {
      parse_mode: 'Markdown',
      reply_markup: getKeyboard()
    }
  );
});

// ─── Handle images sent as files/documents ────────────
bot.on('document', (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;

  // Only accept image files
  if (!doc.mime_type || !doc.mime_type.startsWith('image/')) {
    bot.sendMessage(chatId, '⚠️ Please send a valid image file (JPG, PNG, etc.)');
    return;
  }

  saveImage(chatId, doc.file_id);

  bot.sendMessage(
    chatId,
    '🖼️ *Image received!*\n\nChoose an action:',
    {
      parse_mode: 'Markdown',
      reply_markup: getKeyboard()
    }
  );
});

// ─── Handle button taps ───────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  // Dismiss the loading spinner on the button
  await bot.answerCallbackQuery(query.id, { text: '⏳ Processing...' });

  const session = getImage(chatId);

  if (!session) {
    bot.sendMessage(chatId, '⚠️ No image found. Please send a photo first!');
    return;
  }

  try {
    await bot.sendMessage(chatId, '⏳ Processing your image, please wait...');

    // Step 1: Get download URL from Telegram
    const fileLink = await bot.getFileLink(session.fileId);

    // Step 2: Download image as buffer
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // Step 3: Apply the transformation
    const processedBuffer = await processImage(imageBuffer, action);

    // Step 4: Send back the processed image with buttons
    await bot.sendPhoto(chatId, processedBuffer, {
      caption:
        `✅ *${ACTION_LABELS[action]}*\n\n` +
        `Apply another action or send a new photo!`,
      parse_mode: 'Markdown',
      reply_markup: getKeyboard()
    });

  } catch (err) {
    console.error('Image processing error:', err.message);
    bot.sendMessage(
      chatId,
      '❌ Something went wrong processing your image.\nPlease try sending the photo again.'
    );
  }
});

// ─── Handle plain text messages ───────────────────────
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignore commands, photos, documents
  if (!text || text.startsWith('/')) return;

  bot.sendMessage(
    chatId,
    '📸 Please send me a *photo* to flip or rotate!',
    { parse_mode: 'Markdown' }
  );
});

module.exports = { bot };
