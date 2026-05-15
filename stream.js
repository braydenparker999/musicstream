import ytdl from '@distube/ytdl-core';
import ytSearch from 'yt-search';

export const config = { maxDuration: 30 };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, id } = req.query;
  if (!q && !id) return res.status(400).json({ error: 'Provide q= or id=' });

  try {
    let videoId = id;

    if (!videoId) {
      // Search YouTube for the song
      const { videos } = await ytSearch(q);
      // Pick first result that looks like a full song (30s–12min)
      const hit = videos.find(v => v.seconds >= 60 && v.seconds <= 720);
      if (!hit) return res.status(404).json({ error: 'No match found' });
      videoId = hit.videoId;
    }

    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const fmt = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    if (!fmt?.url) return res.status(404).json({ error: 'No audio stream' });

    res.status(200).json({
      url: fmt.url,
      videoId,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds) || 0,
      thumbnail: info.videoDetails.thumbnails?.at(-1)?.url || '',
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}
