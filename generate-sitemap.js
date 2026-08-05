import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSitemap() {
  const baseUrl = 'https://www.elitebooking.ng';
  
  // Static pages / sections
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '#hotels', priority: '0.9', changefreq: 'daily' },
    { url: '#shortlets', priority: '0.9', changefreq: 'daily' },
    { url: '#cars', priority: '0.8', changefreq: 'weekly' },
    { url: '#destinations', priority: '0.8', changefreq: 'weekly' },
    { url: '#contact', priority: '0.5', changefreq: 'monthly' },
    { url: '#faq', priority: '0.5', changefreq: 'monthly' },
  ];

  // Extract IDs from src/App.tsx dynamically to ensure future pages/hotels are automatically included
  let dynamicEntries = [];
  try {
    const appContent = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
    const idRegex = /id:\s*['"]([^'"]+)['"]/g;
    let match;
    const ids = new Set();
    while ((match = idRegex.exec(appContent)) !== null) {
      ids.add(match[1]);
    }

    dynamicEntries = Array.from(ids).map(id => ({
      url: `#hotel-${id}`,
      priority: '0.7',
      changefreq: 'weekly'
    }));
  } catch (err) {
    console.error('Error reading App.tsx for sitemap IDs:', err);
  }

  const allEntries = [...staticPages, ...dynamicEntries];
  const currentDate = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  allEntries.forEach(entry => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/${entry.url}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    xml += `    <priority>${entry.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  const outputPath = path.join(__dirname, 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`Successfully generated sitemap.xml with ${allEntries.length} URLs at ${outputPath}`);
}

generateSitemap();
