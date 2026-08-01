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

    var html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 代码块
      .replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, function (_, lang, code) {
        return '<pre class="expressive-code"><code class="language-' + (lang || 'text') + '">' + code.trim() + '</code></pre>';
      })
      // 行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 标题
      .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      // 引用
      .replace(/^\> (.*)$/gm, '<blockquote>$1</blockquote>')
      // 图片
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // 粗体/斜体
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // 删除线
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // 无序列表
      .replace(/^[-*+] (.*)$/gm, '<li>$1</li>')
      // 有序列表
      .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
      // 水平线
      .replace(/^---$/gm, '<hr />')
      // 段落与换行
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br />');

    // 包裹列表
    html = html.replace(/(<li>.*<\/li>)/g, function (match) {
      if (match.indexOf('<ol>') === -1) return '<ul>' + match + '</ul>';
      return match;
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