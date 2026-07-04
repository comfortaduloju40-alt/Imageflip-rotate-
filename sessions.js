// Stores the last image file_id per user
const sessions = {};

function saveImage(chatId, fileId) {
  sessions[chatId] = { fileId };
}

function getImage(chatId) {
  return sessions[chatId] || null;
}

function clearImage(chatId) {
  delete sessions[chatId];
}

module.exports = { saveImage, getImage, clearImage };
