module.exports = async (req, res) => {
  const profile = String(req.query.profile || '');
  let pageUrl;
  try {
    pageUrl = new URL(profile);
  } catch {
    return res.status(400).send('Invalid profile URL');
  }

  if (pageUrl.hostname !== 'www.realmadrid.com' ||
      !pageUrl.pathname.startsWith('/es-ES/futbol/cantera-masculina/')) {
    return res.status(403).send('Profile source not allowed');
  }

  try {
    const response = await fetch(pageUrl.toString(), {
      headers: { 'User-Agent': 'FutureRadarFC/1.0 (official academy photo resolver)' }
    });
    if (!response.ok) return res.status(404).send('Official profile unavailable');

    const html = await response.text();
    const tags = html.match(/<meta\\b[^>]*>/gi) || [];
    let image = '';

    for (const tag of tags) {
      const property = tag.match(/(?:property|name)=["'](?:og:image|twitter:image)["']/i);
      if (!property) continue;
      const content = tag.match(/content=["']([^"']+)["']/i);
      if (content) {
        image = content[1].replace(/&amp;/g, '&').replace(/&#x2F;/g, '/');
        break;
      }
    }

    if (!image) return res.status(404).send('No official player image found');
    const imageUrl = new URL(image, pageUrl);
    if (!['assets.realmadrid.com', 'www.realmadrid.com'].includes(imageUrl.hostname)) {
      return res.status(403).send('Image host not allowed');
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.redirect(302, imageUrl.toString());
  } catch (error) {
    return res.status(502).send('Could not resolve official player image');
  }
};
