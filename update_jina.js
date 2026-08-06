const fs = require('fs');

const files = [
  {
    path: 'src/lib/rag/sync.ts',
    replacements: [
      {
        old: 'const response = await fetch(`https://r.jina.ai/${args.rootUrl}`);\n  const markdown = await response.text();\n\n  const docs = [{\n    url: args.rootUrl,\n    title: args.slug || args.rootUrl,\n    markdown: markdown,\n  }];\n\n  const chunkInputs: Array<{ url?: string; title?: string; text: string }> = [];\n  // Split by headers (#) and ingest as KnowledgeEmbedding\n  const jinaChunks = markdown.split(\'\\n#\');\n  \n  for (const chunk of jinaChunks) {\n    if (!chunk.trim()) continue;\n    const text = chunk.startsWith(\'#\') ? chunk : \'#\' + chunk;\n    chunkInputs.push({ \n      url: args.rootUrl, \n      title: args.slug || args.rootUrl, \n      text \n    });\n  }',
        new: 'const response = await fetch(`https://r.jina.ai/${args.rootUrl}`, {\n    headers: { \'Accept\': \'text/event-stream\' }\n  });\n  const markdown = await response.text();\n\n  const docs = [{\n    url: args.rootUrl,\n    title: args.slug || args.rootUrl,\n    markdown: markdown,\n  }];\n\n  const chunkInputs: Array<{ url?: string; title?: string; text: string }> = [];\n  // Split by headers to create your chunks\n  const jinaChunks = markdown.split(/\\n(?=# )/g);\n  \n  for (const chunk of jinaChunks) {\n    if (!chunk.trim()) continue;\n    chunkInputs.push({ \n      url: args.rootUrl, \n      title: args.slug || args.rootUrl, \n      text: chunk.trim() \n    });\n  }'
      }
    ]
  },
  {
    path: 'scripts/crawl-competitors.ts',
    replacements: [
      {
        old: 'const response = await fetch(`https://r.jina.ai/${target.url}`);\n      const markdown = await response.text();\n\n      // Split by headers (#) and ingest as KnowledgeEmbedding\n      const chunks = markdown.split(\'\\n#\');\n\n      for (const chunk of chunks) {\n        if (!chunk.trim()) continue;\n        results.push({\n          url: target.url,\n          text: chunk.startsWith(\'#\') ? chunk : \'#\' + chunk,',
        new: 'const response = await fetch(`https://r.jina.ai/${target.url}`, {\n        headers: { \'Accept\': \'text/event-stream\' }\n      });\n      const markdown = await response.text();\n\n      // Split by headers to create your chunks\n      const chunks = markdown.split(/\\n(?=# )/g);\n\n      for (const chunk of chunks) {\n        if (!chunk.trim()) continue;\n        results.push({\n          url: target.url,\n          text: chunk.trim(),'
      }
    ]
  },
  {
    path: 'scripts/crawl-knowledge.ts',
    replacements: [
      {
        old: 'const response = await fetch(`https://r.jina.ai/${url}`);\n      const markdown = await response.text();\n\n      // Split by headers (#) and ingest as KnowledgeEmbedding\n      const chunks = markdown.split(\'\\n#\');\n      const processedChunks = chunks\n        .map(c => c.trim())\n        .filter(Boolean)\n        .map(c => c.startsWith(\'#\') ? c : \'#\' + c);',
        new: 'const response = await fetch(`https://r.jina.ai/${url}`, {\n        headers: { \'Accept\': \'text/event-stream\' }\n      });\n      const markdown = await response.text();\n\n      // Split by headers to create your chunks\n      const chunks = markdown.split(/\\n(?=# )/g);\n      const processedChunks = chunks\n        .map(c => c.trim())\n        .filter(Boolean);'
      }
    ]
  },
  {
    path: 'scripts/firecrawl/scrape-competitors.ts',
    replacements: [
      {
        old: 'const response = await fetch(`https://r.jina.ai/${url}`);\n      const markdown = await response.text();\n\n      // Split by headers (#) and ingest as KnowledgeEmbedding\n      const chunks = markdown.split(\'\\n#\');\n      \n      console.log(`[+] Captured ${chunks.length} Intel Chunks for: ${url}`);\n\n      combinedIntel += `## Intel for: ${url}\\n`;\n      for (const chunk of chunks) {\n        if (!chunk.trim()) continue;\n        const text = chunk.startsWith(\'#\') ? chunk : \'#\' + chunk;\n        combinedIntel += text + "\\n\\n";\n      }',
        new: 'const response = await fetch(`https://r.jina.ai/${url}`, {\n        headers: { \'Accept\': \'text/event-stream\' }\n      });\n      const markdown = await response.text();\n\n      // Split by headers to create your chunks\n      const chunks = markdown.split(/\\n(?=# )/g);\n      \n      console.log(`[+] Captured ${chunks.length} Intel Chunks for: ${url}`);\n\n      combinedIntel += `## Intel for: ${url}\\n`;\n      for (const chunk of chunks) {\n        if (!chunk.trim()) continue;\n        combinedIntel += chunk.trim() + "\\n\\n";\n      }'
      }
    ]
  }
];

files.forEach(f => {
  try {
    let content = fs.readFileSync(f.path, 'utf8');
    let originalContent = content;
    f.replacements.forEach(r => {
      content = content.replace(r.old, r.new);
    });
    if (content !== originalContent) {
      fs.writeFileSync(f.path, content);
      console.log(`Updated ${f.path}`);
    } else {
      console.log(`Skipped ${f.path} - substring not found.`);
    }
  } catch (e) {
    console.error(`Failed to process ${f.path}:`, e.message);
  }
});
