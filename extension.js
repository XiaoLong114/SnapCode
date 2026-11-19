/*
 * SnapCode VS Code 扩展主逻辑
 * 命令：截图选中代码 / 截图当前文件 -> Webview 渲染 -> 保存 PNG
 */
'use strict';

var vscode = require('vscode');
var path = require('path');
var fs = require('fs');

var currentPanel = null;

function activate(context) {
  var config = vscode.workspace.getConfiguration('snapcode');

  function openSnap(useSelection) {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('SnapCode：请先打开一个文件');
      return;
    }

    var document = editor.document;
    var code;
    if (useSelection && !editor.selection.isEmpty) {
      code = document.getText(editor.selection);
    } else {
      code = document.getText();
    }
    if (!code.trim()) {
      vscode.window.showErrorMessage('SnapCode：没有可截图的代码');
      return;
    }

    var filename = path.basename(document.fileName);
    var language = document.languageId;

    var defaults = {
      theme: config.get('defaultTheme', 'oneDark'),
      fontSize: config.get('fontSize', 15),
      fontFamily: config.get('fontFamily', "Consolas, 'Courier New', monospace"),
      lineNumbers: config.get('showLineNumbers', true),
      watermark: config.get('watermark', 'SnapCode')
    };

    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Beside);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'snapcode',
        'SnapCode 代码截图',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
        }
      );
      currentPanel.onDidDispose(function () { currentPanel = null; }, null, context.subscriptions);
      currentPanel.webview.html = getHtml(currentPanel.webview, context.extensionPath);
      currentPanel.webview.onDidReceiveMessage(function (msg) {
        handleMessage(msg, currentPanel);
      }, null, context.subscriptions);
    }

    // 等 webview ready 后再发数据；若已 ready 直接发
    setTimeout(function () {
      currentPanel.webview.postMessage({
        type: 'init',
        code: code,
        filename: filename,
        language: language,
        config: defaults
      });
    }, 120);
  }

  function handleMessage(msg, panel) {
    if (!msg) return;
    if (msg.type === 'save') {
      savePng(msg.dataUrl, msg.filename);
    } else if (msg.type === 'openFolder') {
      vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(msg.path));
    }
  }

  function savePng(dataUrl, filename) {
    try {
      var match = /^data:image\/png;base64,(.*)$/.exec(dataUrl || '');
      if (!match) { vscode.window.showErrorMessage('SnapCode：图片数据无效'); return; }
      var buffer = Buffer.from(match[1], 'base64');

      var suggested = 'snap-' + sanitize(filename || 'code') + '.png';
      var workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : require('os').homedir();
      var defaultUri = vscode.Uri.file(path.join(workspaceFolder, suggested));

      vscode.window.showSaveDialog({
        defaultUri: defaultUri,
        filters: { 'PNG 图片': ['png'] },
        saveLabel: '保存截图'
      }).then(function (uri) {
        if (!uri) return;
        fs.writeFile(uri.fsPath, buffer, function (err) {
          if (err) {
            vscode.window.showErrorMessage('SnapCode：保存失败 - ' + err.message);
          } else {
            vscode.window.showInformationMessage('SnapCode：已保存 ' + path.basename(uri.fsPath));
          }
        });
      });
    } catch (e) {
      vscode.window.showErrorMessage('SnapCode：导出失败 - ' + e.message);
    }
  }

  function sanitize(name) {
    return String(name).replace(/[^\w.-]+/g, '_').slice(0, 60);
  }

  function getHtml(webview, extensionPath) {
    var media = webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'media'))).toString();
    var nonce = getNonce();
    var html = fs.readFileSync(path.join(__dirname, 'media', 'index.html'), 'utf8');

    // 注入 CSP（放在 <head> 之后）
    var csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; '
      + 'img-src data: ' + webview.cspSource + '; '
      + 'style-src ' + nonce + ' \'unsafe-inline\' ' + webview.cspSource + '; '
      + 'font-src ' + webview.cspSource + '; '
      + 'script-src \'nonce-' + nonce + '\' ' + media + ';">';
    html = html.replace(/<head>/, '<head>' + csp);

    // 外部脚本：改为 webview URI 并加 nonce
    html = html.replace(/<script src="tokenizer\.js"><\/script>/,
      '<script nonce="' + nonce + '" src="' + media + '/tokenizer.js"></script>');
    html = html.replace(/<script src="renderer\.js"><\/script>/,
      '<script nonce="' + nonce + '" src="' + media + '/renderer.js"></script>');
    // 内联脚本：加 nonce（只给带内容的 <script> 标签，排除上面的外部引用已被替换）
    html = html.replace(/<script>([\s\S]*?)<\/script>/,
      '<script nonce="' + nonce + '">$1</script>');

    return html;
  }

  function getNonce() {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }

  var disposable1 = vscode.commands.registerCommand('snapcode.snapSelection', function () { openSnap(true); });
  var disposable2 = vscode.commands.registerCommand('snapcode.snapFile', function () { openSnap(false); });
  context.subscriptions.push(disposable1, disposable2);
}

function deactivate() {
  if (currentPanel) currentPanel.dispose();
}

module.exports = { activate: activate, deactivate: deactivate };
