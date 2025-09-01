const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors()); // Enable CORS for all routes to allow requests from your frontend
app.use(express.json()); // Enable the server to parse JSON request bodies

// Route to handle video info requests
app.post('/api/getVideoInfo', async (req, res) => {
  try {
    const { videoUrl, quality: requestedQuality } = req.body;

    // Validate the URL before proceeding
    if (!videoUrl || !ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ error: 'الرابط غير صالح أو غير مدعوم' });
    }

    const info = await ytdl.getInfo(videoUrl);

    // Filter to get only valid MP4 formats with both video and audio
    const usableFormats = info.formats
      .filter(f => f.hasVideo && f.hasAudio && f.container === 'mp4' && f.qualityLabel)
      .sort((a, b) => parseInt(b.qualityLabel) - parseInt(a.qualityLabel));

    if (usableFormats.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على صيغ تحميل صالحة (MP4) لهذا الفيديو.' });
    }

    let targetFormat = null;
    if (requestedQuality === 'highest') {
      targetFormat = usableFormats[0];
    } else {
      targetFormat = usableFormats.find(f => f.qualityLabel === requestedQuality);
    }

    const thumbnails = info.videoDetails.thumbnails;
    const thumbnailUrl = thumbnails && thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';

    const videoDetails = {
      title: info.videoDetails.title,
      thumbnail: thumbnailUrl,
      source: "يوتيوب",
      requestedQuality: requestedQuality,
      format: targetFormat ? {
        quality: targetFormat.qualityLabel,
        url: targetFormat.url,
      } : null,
    };

    res.status(200).json(videoDetails);

  } catch (error) {
    console.error('Error fetching video info:', error);
    const errorMessage = error.message.includes('No video id found')
      ? 'فشل في تحليل رابط الفيديو. تأكد من صحته.'
      : 'حدث خطأ في الخادم. قد يكون الفيديو خاصاً أو مقيداً جغرافياً.';
    
    res.status(500).json({ error: errorMessage });
  }
});

// A simple root route to confirm the server is running
app.get('/', (req, res) => {
  res.send('Vid-Jet Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

