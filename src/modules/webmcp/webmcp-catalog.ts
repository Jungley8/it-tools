import type { WebMCPToolSummary } from './webmcp.types';
import { coreExecutableTools } from './webmcp-tools';
import { toolsWithCategory } from '@/tools';

export function getAllCatalogTools(): WebMCPToolSummary[] {
  const executableMap = new Map<string, string>();
  for (const tool of coreExecutableTools) {
    if (tool.routePath) {
      executableMap.set(tool.routePath, tool.name);
    }
  }

  return toolsWithCategory.map((tool) => {
    const isDirectlyExecutable = executableMap.has(tool.path);
    const mappedName
      = executableMap.get(tool.path) ?? tool.path.replace(/^\//, '').replace(/-/g, '_');

    return {
      name: mappedName,
      title: String(tool.name),
      description: String(tool.description),
      category: tool.category,
      path: tool.path,
      keywords: tool.keywords ?? [],
      isDirectlyExecutable,
      scope: isDirectlyExecutable ? 'route' : 'catalog',
    };
  });
}

export function searchCatalogTools(
  query: string,
  options: { category?: string; directlyExecutableOnly?: boolean } = {},
): WebMCPToolSummary[] {
  const tools = getAllCatalogTools();
  const q = (query ?? '').trim().toLowerCase();
  const categoryFilter = options.category?.trim().toLowerCase();
  const directlyOnly = Boolean(options.directlyExecutableOnly);

  return tools.filter((tool) => {
    if (directlyOnly && !tool.isDirectlyExecutable) {
      return false;
    }

    if (categoryFilter && tool.category.toLowerCase() !== categoryFilter) {
      return false;
    }

    if (!q) {
      return true;
    }

    const terms = q.split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return true;
    }

    return terms.every(term =>
      tool.name.toLowerCase().includes(term)
      || tool.title.toLowerCase().includes(term)
      || tool.description.toLowerCase().includes(term)
      || tool.category.toLowerCase().includes(term)
      || tool.keywords.some(k => k.toLowerCase().includes(term)),
    );
  });
}
