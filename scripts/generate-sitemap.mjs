import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const toolsDir = join(rootDir, 'src/tools');
const sitemapPath = join(rootDir, 'public/sitemap.xml');

const DOMAIN = process.env.SITE_URL || 'https://it-tools.appio.fun';

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
];

const toolDirs = readdirSync(toolsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

const toolRoutes = [];

for (const dir of toolDirs) {
  const indexPath = join(toolsDir, dir, 'index.ts');
  try {
    const content = readFileSync(indexPath, 'utf8');
    const pathMatch = content.match(/path:\s*['"]([^'"]+)['"]/);
    if (pathMatch) {
      toolRoutes.push({
        path: pathMatch[1],
        priority: '0.8',
        changefreq: 'weekly',
      });
    }
  } catch {
    // skip non-tool directories
  }
}

// Sort tools alphabetically by path
toolRoutes.sort((a, b) => a.path.localeCompare(b.path));

const allRoutes = [...staticRoutes, ...toolRoutes];
const today = new Date().toISOString().split('T')[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allRoutes
  .map(
    route => `  <url>
    <loc>${DOMAIN}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

writeFileSync(sitemapPath, xml, 'utf8');
console.log(`Generated sitemap with ${allRoutes.length} URLs at ${sitemapPath}`);
