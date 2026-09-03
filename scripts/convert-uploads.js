const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const leaderboardFiles = [
  path.join(__dirname, '..', 'leaderboard.json'),
  path.join(__dirname, '..', 'public', 'leaderboard.json')
];

async function main() {
  const files = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() !== '.png')
    .map(entry => entry.name);
  const renamed = new Map();

  for (const filename of files) {
    const newFilename = `${filename}.png`;
    try {
      await sharp(path.join(uploadsDir, filename))
        .png()
        .toFile(path.join(uploadsDir, newFilename));
      fs.unlinkSync(path.join(uploadsDir, filename));
      renamed.set(filename, newFilename);
    } catch (error) {
      console.warn(`Skipped unreadable upload ${filename}: ${error.message}`);
      if (fs.existsSync(path.join(uploadsDir, newFilename))) {
        fs.unlinkSync(path.join(uploadsDir, newFilename));
      }
    }
  }

  for (const leaderboardFile of leaderboardFiles) {
    if (!fs.existsSync(leaderboardFile)) continue;
    const board = JSON.parse(fs.readFileSync(leaderboardFile, 'utf8'));
    for (const entry of board) {
      const match = entry.image && entry.image.match(/\/uploads\/([^/]+)$/);
      if (match && renamed.has(match[1])) entry.image = `/uploads/${renamed.get(match[1])}`;
    }
    fs.writeFileSync(leaderboardFile, JSON.stringify(board, null, 2) + '\n');
  }

  console.log(`Converted ${renamed.size} upload(s) to PNG.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
