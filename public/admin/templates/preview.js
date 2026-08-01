/**
 * Decap CMS 自定义预览模板
 * 将 Markdown 编辑器内容渲染为博客文章样式
 */
(function () {
  'use strict';

  var h = window.h;

  // 简易 Markdown 渲染器（轻量版，支持常见语法）
  function renderMarkdown(md) {
    if (!md) return '';

    // 先对 & < > 做 HTML 转义
    var html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 保护代码块 —— 先用占位符替换，避免被后续正则破坏
    var codeBlocks = [];
    html = html.replace(/```([a-zA-Z0-9+#]*)\n?([\s\S]*?)```/g, function (_, lang, code) {
      var idx = codeBlocks.length;
      codeBlocks.push(
        '<pre class="expressive-code"><code class="language-' + (lang || 'text') + '">' +
        code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') +
        '</code></pre>'
      );
      return '\x00CODEBLOCK' + idx + '\x00';
    });

    // 保护行内代码（避免被后续的 *、` 等规则破坏）
    var inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, function (_, code) {
      var idx = inlineCodes.length;
      inlineCodes.push('<code>' + code + '</code>');
      return '\x00INLINECODE' + idx + '\x00';
    });

    // 逐行解析 Markdown
    var lines = html.split('\n');
    var result = [];
    var inList = false;
    var listType = null; // 'ul' or 'ol'

    function closeList() {
      if (inList) {
        result.push('</' + listType + '>');
        inList = false;
        listType = null;
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // 空行 → 关闭列表
      if (trimmed === '') {
        closeList();
        continue;
      }

      // 水平线
      if (/^---$/.test(trimmed)) {
        closeList();
        result.push('<hr />');
        continue;
      }

      // 标题
      var headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        closeList();
        var level = headerMatch[1].length;
        result.push('<h' + level + '>' + headerMatch[2] + '</h' + level + '>');
        continue;
      }

      // 引用
      var bqMatch = trimmed.match(/^>\s?(.*)$/);
      if (bqMatch) {
        closeList();
        result.push('<blockquote>' + bqMatch[1] + '</blockquote>');
        continue;
      }

      // 无序列表
      var ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          closeList();
          result.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        result.push('<li>' + ulMatch[1] + '</li>');
        continue;
      }

      // 有序列表
      var olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        if (!inList || listType !== 'ol') {
          closeList();
          result.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        result.push('<li>' + olMatch[1] + '</li>');
        continue;
      }

      // 普通段落
      closeList();
      // 处理行内粗体/斜体/删除线/图片/链接
      line = line
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      result.push('<p>' + line + '</p>');
    }

    closeList();

    html = result.join('\n');

    // 恢复行内代码占位符
    html = html.replace(/\x00INLINECODE(\d+)\x00/g, function (_, idx) {
      return inlineCodes[parseInt(idx)];
    });

    // 恢复代码块占位符
    html = html.replace(/\x00CODEBLOCK(\d+)\x00/g, function (_, idx) {
      return codeBlocks[parseInt(idx)];
    });

    // 处理段落内的换行（单个 \n 转为 <br />）
    html = html.replace(/<p>(.*?)<\/p>/g, function (_, content) {
      return '<p>' + content.replace(/\n/g, '<br />') + '</p>';
    });

    return '<div class="custom-md">' + html + '</div>';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function PostPreview(props) {
    var entry = props.entry;
    var title = entry.getIn(['data', 'title']) || '无标题';
    var published = entry.getIn(['data', 'published']);
    var description = entry.getIn(['data', 'description']) || '';
    var category = entry.getIn(['data', 'category']) || '';
    var tags = entry.getIn(['data', 'tags']) || [];
    var image = entry.getIn(['data', 'image']) || '';
    var body = entry.getIn(['data', 'body']) || '';

    if (Array.isArray(tags)) {
      tags = tags.filter(function (t) { return !!t; });
    } else {
      tags = [];
    }

    return h('article', { className: 'cms-preview-post' }, [
      h('header', { className: 'cms-preview-header' }, [
        category && h('span', { className: 'cms-preview-category' }, category),
        h('h1', { className: 'cms-preview-title' }, title),
        description && h('p', { className: 'cms-preview-desc' }, description),
        h('div', { className: 'cms-preview-meta' }, [
          published && h('time', {}, formatDate(published)),
          tags.length > 0 && h('span', { className: 'cms-preview-tags' }, tags.map(function (tag) {
            return h('span', { key: tag, className: 'cms-preview-tag' }, tag);
          }))
        ])
      ]),
      image && h('figure', { className: 'cms-preview-cover' }, h('img', { src: image, alt: title })),
      h('div', { className: 'cms-preview-body', dangerouslySetInnerHTML: { __html: renderMarkdown(body) } })
    ]);
  }

  if (window.CMS) {
    window.CMS.registerPreviewStyle('/admin/templates/preview.css');
    window.CMS.registerPreviewTemplate('posts', PostPreview);
  } else {
    console.warn('[CMS] CMS 对象未就绪，预览模板注册失败');
  }
})();
