/*
 * SnapCode canvas 渲染器（零依赖）
 * 把代码按主题配置绘制到 canvas，支持 2x 高清导出。
 */
(function (global) {
  'use strict';

  // 配色主题：每个 token 类型对应一个颜色
  var THEMES = {
    oneDark: {
      label: 'One Dark',
      bg: ['#282c34', '#21252b'], bgAngle: 1,
      window: '#282c34', titleBar: '#21252b', titleText: '#abb2bf',
      dot1: '#ff5f57', dot2: '#febc2e', dot3: '#28c840',
      gutter: '#5c6370',
      plain: '#abb2bf', keyword: '#c678dd', type: '#e5c07b',
      string: '#98c379', comment: '#5c6370', number: '#d19a66',
      func: '#61afef', operator: '#56b6c2'
    },
    dracula: {
      label: 'Dracula',
      bg: ['#282a36', '#1e1f29'], bgAngle: 1,
      window: '#282a36', titleBar: '#21222c', titleText: '#f8f8f2',
      dot1: '#ff5555', dot2: '#f1fa8c', dot3: '#50fa7b',
      gutter: '#6272a4',
      plain: '#f8f8f2', keyword: '#ff79c6', type: '#8be9fd',
      string: '#f1fa8c', comment: '#6272a4', number: '#bd93f9',
      func: '#50fa7b', operator: '#ff79c6'
    },
    monokai: {
      label: 'Monokai',
      bg: ['#272822', '#1c1d19'], bgAngle: 1,
      window: '#272822', titleBar: '#1c1d19', titleText: '#f8f8f2',
      dot1: '#ff5f57', dot2: '#febc2e', dot3: '#28c840',
      gutter: '#75715e',
      plain: '#f8f8f2', keyword: '#f92672', type: '#a6e22e',
      string: '#e6db74', comment: '#75715e', number: '#ae81ff',
      func: '#a6e22e', operator: '#f92672'
    },
    githubDark: {
      label: 'GitHub Dark',
      bg: ['#0d1117', '#161b22'], bgAngle: 1,
      window: '#161b22', titleBar: '#0d1117', titleText: '#c9d1d9',
      dot1: '#ff5f57', dot2: '#febc2e', dot3: '#28c840',
      gutter: '#6e7681',
      plain: '#c9d1d9', keyword: '#ff7b72', type: '#79c0ff',
      string: '#a5d6ff', comment: '#8b949e', number: '#79c0ff',
      func: '#d2a8ff', operator: '#ff7b72'
    },
    solarizedLight: {
      label: 'Solarized Light',
      bg: ['#fdf6e3', '#eee8d5'], bgAngle: 1,
      window: '#fdf6e3', titleBar: '#eee8d5', titleText: '#586e75',
      dot1: '#dc322f', dot2: '#b58900', dot3: '#859900',
      gutter: '#93a1a1',
      plain: '#586e75', keyword: '#859900', type: '#268bd2',
      string: '#2aa198', comment: '#93a1a1', number: '#d33682',
      func: '#268bd2', operator: '#859900'
    },
    minimalWhite: {
      label: '极简白',
      bg: ['#ffffff', '#f2f4f8'], bgAngle: 1,
      window: '#ffffff', titleBar: '#f6f8fb', titleText: '#57606a',
      dot1: '#ff5f57', dot2: '#febc2e', dot3: '#28c840',
      gutter: '#a0a8b3',
      plain: '#24292f', keyword: '#cf222e', type: '#0550ae',
      string: '#0a3069', comment: '#8c959f', number: '#0550ae',
      func: '#8250df', operator: '#cf222e'
    },
    lavender: {
      label: '薰衣草',
      bg: ['#7b6cf0', '#4c3fb5'], bgAngle: 1,
      window: 'rgba(255,255,255,0.10)', titleBar: 'rgba(255,255,255,0.08)', titleText: '#ffffff',
      dot1: '#ff8a80', dot2: '#ffd180', dot3: '#b9f6ca',
      gutter: 'rgba(255,255,255,0.55)',
      plain: '#ffffff', keyword: '#fff59d', type: '#b3e5fc',
      string: '#c8e6c9', comment: 'rgba(255,255,255,0.55)', number: '#ffccbc',
      func: '#e1bee7', operator: '#b3e5fc'
    }
  };

  function colorFor(theme, type) {
    if (type === 'function') return theme.func;
    if (type === 'comment') return theme.comment;
    if (type === 'keyword') return theme.keyword;
    if (type === 'type') return theme.type;
    if (type === 'string') return theme.string;
    if (type === 'number') return theme.number;
    if (type === 'operator') return theme.operator;
    return theme.plain;
  }

  function drawGradient(ctx, colors, w, h, angle) {
    var g;
    if (angle === 0) g = ctx.createLinearGradient(0, 0, 0, h);
    else if (angle === 2) g = ctx.createLinearGradient(0, 0, w, h);
    else g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[1]);
    return g;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  /**
   * render(config) -> HTMLCanvasElement
   * config: { code, language, filename, theme, fontSize, fontFamily,
   *           lineNumbers, padding, watermark, shadow, titleBar, scale }
   */
  function render(config) {
    var theme = THEMES[config.theme] || THEMES.oneDark;
    var scale = config.scale || 2;
    var fontSize = Math.max(8, Math.min(36, config.fontSize || 15));
    var lineHeight = Math.round(fontSize * 1.55);
    var padding = Math.max(16, Math.min(80, config.padding || 48));
    var fontFamily = config.fontFamily || "Consolas, 'Courier New', monospace";
    var lines = String(config.code || '').replace(/\r/g, '').split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines = lines.slice(0, -1);
    if (!lines.length) lines = [''];

    // 预测量尺寸（用一个临时 ctx）
    var measure = document.createElement('canvas').getContext('2d');
    measure.font = fontSize + 'px ' + fontFamily;
    var maxTextWidth = 0;
    var tokensByLine = [];
    var state = { inBlockComment: false };
    lines.forEach(function (line) {
      var tokens = global.SnapTokenizer.tokenize(line, config.language || 'javascript', state);
      tokensByLine.push(tokens);
      var text = tokens.map(function (t) { return t.text; }).join('');
      maxTextWidth = Math.max(maxTextWidth, measure.measureText(text).width);
    });

    var gutterW = config.lineNumbers ? Math.max(28, String(lines.length).length * fontSize * 0.75 + fontSize) : 0;
    var titleH = config.titleBar === false ? 0 : Math.round(fontSize * 2.2);
    var codeTop = padding + titleH + fontSize * 0.9;
    var contentW = gutterW + maxTextWidth + fontSize; // 右侧留余量
    var windowW = contentW + padding * 2;
    var windowH = codeTop + lines.length * lineHeight + padding - fontSize * 0.4;
    var canvasW = windowW + padding * 2;
    var canvasH = windowH + padding * 2;

    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(canvasW * scale);
    canvas.height = Math.ceil(canvasH * scale);
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 背景
    ctx.fillStyle = drawGradient(ctx, theme.bg, canvasW, canvasH, theme.bgAngle == null ? 1 : theme.bgAngle);
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 阴影
    if (config.shadow !== false) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      roundRect(ctx, padding, padding, windowW, windowH, 12);
      ctx.fillStyle = theme.window;
      ctx.fill();
      ctx.restore();
    }

    // 窗口
    roundRect(ctx, padding, padding, windowW, windowH, 12);
    ctx.fillStyle = theme.window;
    ctx.fill();
    ctx.save();
    ctx.clip();

    // 标题栏
    if (titleH > 0) {
      ctx.fillStyle = theme.titleBar;
      ctx.fillRect(padding, padding, windowW, titleH);
      var cy = padding + titleH / 2;
      var dots = [theme.dot1, theme.dot2, theme.dot3];
      dots.forEach(function (col, idx) {
        ctx.beginPath();
        ctx.arc(padding + 22 + idx * 20, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      });
      // 文件名
      ctx.fillStyle = theme.titleText;
      ctx.font = Math.max(11, fontSize * 0.82) + 'px ' + fontFamily;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var fname = config.filename || 'snippet';
      if (ctx.measureText(fname).width > windowW - 140) {
        while (ctx.measureText(fname + '…').width > windowW - 140 && fname.length > 1) fname = fname.slice(0, -1);
        fname += '…';
      }
      ctx.fillText(fname, padding + windowW / 2, cy);
      ctx.textAlign = 'left';
    }

    // 代码行
    ctx.font = fontSize + 'px ' + fontFamily;
    ctx.textBaseline = 'alphabetic';
    var codeX = padding + gutterW + fontSize * 0.4;
    tokensByLine.forEach(function (tokens, idx) {
      var y = codeTop + idx * lineHeight;
      // 行号
      if (config.lineNumbers) {
        ctx.fillStyle = theme.gutter;
        ctx.textAlign = 'right';
        ctx.fillText(String(idx + 1), padding + gutterW - fontSize * 0.25, y);
        ctx.textAlign = 'left';
      }
      // token
      var x = codeX;
      tokens.forEach(function (tok) {
        ctx.fillStyle = colorFor(theme, tok.type);
        ctx.fillText(tok.text, x, y);
        x += ctx.measureText(tok.text).width;
      });
    });

    ctx.restore(); // 解除窗口 clip

    // 水印
    if (config.watermark) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = Math.max(10, fontSize * 0.7) + 'px ' + fontFamily;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(config.watermark, canvasW - padding * 0.7, canvasH - padding * 0.55);
      ctx.textAlign = 'left';
    }

    return canvas;
  }

  global.SnapRenderer = { render: render, THEMES: THEMES };
})(typeof window !== 'undefined' ? window : globalThis);
