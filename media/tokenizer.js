/*
 * 轻量语法高亮 tokenizer（零依赖）
 * 把一行源码切成 [{ text, type }]，type 用于映射到配色。
 */
(function (global) {
  'use strict';

  var KEYWORDS = {
    generic: ('if else for while do switch case break continue return function class new this super ' +
      'try catch finally throw typeof instanceof in of var let const import export from default ' +
      'async await yield void delete static public private protected override extends implements ' +
      'interface enum struct package namespace using with as is and or not then end def lambda ' +
      'pass raise except global nonlocal print echo fn func var mut match loop when where select ' +
      'go defer chan map range type nil true false null undefined self None True False').split(/\s+/),
    types: ('int long short float double char bool boolean string byte void object number any ' +
      'String Number Boolean Array Object List Map Set Dict Tuple usize i8 i16 i32 i64 u8 u16 u32 u64 ' +
      'int8 int16 int32 int64 uint8 uint16 uint32 uint64 f32 f64 str Vec Option Result Box ' +
      'Integer Long Double Character BigDecimal ArrayList HashMap DateTime var').split(/\s+/)
  };

  var KEYWORD_SET = {};
  KEYWORDS.generic.forEach(function (k) { KEYWORD_SET[k] = 'keyword'; });
  KEYWORDS.types.forEach(function (k) { KEYWORD_SET[k] = 'type'; });

  // 注释前缀：按语言配置
  var LINE_COMMENT = {
    javascript: '//', typescript: '//', java: '//', kotlin: '//', c: '//', cpp: '//',
    csharp: '//', go: '//', rust: '//', swift: '//', php: '//', scala: '//', dart: '//',
    python: '#', bash: '#', shell: '#', ruby: '#', yaml: '#', makefile: '#', r: '#',
    sql: '--', haskell: '--', lua: '--'
  };

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * tokenize(line, lang, state)
   * state = { inBlockComment: boolean } 跨行块注释状态，会被原地修改
   */
  function tokenize(line, lang, state) {
    state = state || { inBlockComment: false };
    var out = [];
    var i = 0;
    var n = line.length;
    var lineComment = LINE_COMMENT[(lang || '').toLowerCase()] || '//';
    var blockCommentStart = '/*';
    var blockCommentEnd = '*/';

    function push(text, type) {
      if (!text) return;
      var last = out[out.length - 1];
      if (last && last.type === type) last.text += text;
      else out.push({ text: text, type: type });
    }

    while (i < n) {
      // 跨行块注释中
      if (state.inBlockComment) {
        var endIdx = line.indexOf(blockCommentEnd, i);
        if (endIdx === -1) {
          push(line.slice(i), 'comment');
          i = n;
        } else {
          push(line.slice(i, endIdx + 2), 'comment');
          i = endIdx + 2;
          state.inBlockComment = false;
        }
        continue;
      }

      var rest = line.slice(i);
      var c = line[i];

      // 行注释
      if (rest.indexOf(lineComment) === 0) {
        push(line.slice(i), 'comment');
        break;
      }

      // 块注释
      if (rest.indexOf(blockCommentStart) === 0) {
        var be = line.indexOf(blockCommentEnd, i + 2);
        if (be === -1) {
          push(line.slice(i), 'comment');
          state.inBlockComment = true;
          i = n;
        } else {
          push(line.slice(i, be + 2), 'comment');
          i = be + 2;
        }
        continue;
      }

      // 字符串（单引号 / 双引号 / 反引号）
      if (c === '"' || c === "'" || c === '`') {
        var quote = c;
        var j = i + 1;
        var prev = '';
        while (j < n) {
          if (line[j] === quote && prev !== '\\') { j++; break; }
          prev = line[j];
          j++;
        }
        push(line.slice(i, j), 'string');
        i = j;
        continue;
      }

      // 数字
      if (/[0-9]/.test(c) && !/[A-Za-z_$]/.test(prevChar(line, i))) {
        var m = rest.match(/^(0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(\.\d+)?([eE][+-]?\d+)?)/);
        if (m) {
          push(m[0], 'number');
          i += m[0].length;
          continue;
        }
      }

      // 标识符 / 关键字
      if (/[A-Za-z_$]/.test(c)) {
        var wm = rest.match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
        if (wm) {
          var word = wm[0];
          var after = line.slice(i + word.length);
          var type = KEYWORD_SET[word] || null;
          if (!type && /^\s*\(/.test(after)) type = 'function';
          if (!type && /^[A-Z]/.test(word)) type = 'type';
          push(word, type || 'plain');
          i += word.length;
          continue;
        }
      }

      // 运算符与标点
      if (/[+\-*/%=<>!&|^~?:;,.()\[\]{}]/.test(c)) {
        var om = rest.match(/^(=>|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|<<|>>|\?\?|\?\.|::|->|[+\-*/%=<>!&|^~?:;,.()\[\]{}])/);
        if (om) {
          push(om[0], 'operator');
          i += om[0].length;
          continue;
        }
      }

      push(c, 'plain');
      i++;
    }

    return out;
  }

  function prevChar(line, i) {
    return i > 0 ? line[i - 1] : '';
  }

  global.SnapTokenizer = { tokenize: tokenize };
})(typeof window !== 'undefined' ? window : globalThis);
