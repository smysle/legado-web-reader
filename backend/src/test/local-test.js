const assert = require('assert');
const express = require('express');

const app = require('../app');

async function createMockSite() {
  const site = express();

  site.get('/search', (req, res) => {
    const key = req.query.key || '';
    res.send(`
      <html><body>
        <ul class="book-list">
          <li>
            <span class="name">${key} 小说</span>
            <span class="author">测试作者</span>
            <span class="intro">测试简介</span>
            <span class="kind">玄幻</span>
            <span class="last">第10章</span>
            <span class="word">10万字</span>
            <img src="/cover.jpg" />
            <a class="detail" href="/book/1">详情</a>
          </li>
        </ul>
      </body></html>
    `);
  });

  site.get('/book/1', (_req, res) => {
    res.send(`
      <html><body>
        <h1 id="book-title">测试小说</h1>
        <p class="author">测试作者</p>
        <p class="intro">一本用于本地测试的小说</p>
        <p class="kind">轻小说</p>
        <p class="last">第20章</p>
        <p class="wordcount">20万字</p>
        <img id="cover" src="/cover.jpg" />
        <a id="toc" href="/book/1/toc">目录</a>
      </body></html>
    `);
  });

  site.get('/book/1/toc', (req, res) => {
    const page = Number(req.query.page || 1);
    if (page === 1) {
      res.send(`
        <html><body>
          <ul class="toc-list">
            <li><a href="/book/1/chapter/1">第一章</a><span class="vip">false</span></li>
            <li><a href="/book/1/chapter/2">第二章</a><span class="vip">false</span></li>
          </ul>
          <a class="next" href="/book/1/toc?page=2">下一页</a>
        </body></html>
      `);
      return;
    }

    res.send(`
      <html><body>
        <ul class="toc-list">
          <li><a href="/book/1/chapter/3">第三章</a><span class="vip">true</span></li>
        </ul>
      </body></html>
    `);
  });

  site.get('/book/1/chapter/1', (_req, res) => {
    res.send(`
      <html><body>
        <h1>第一章</h1>
        <div id="content"><p>广告文字这是正文A。</p></div>
        <a class="next-content" href="/book/1/chapter/1-2">下一页</a>
      </body></html>
    `);
  });

  site.get('/book/1/chapter/:id', (req, res) => {
    res.send(`<html><body><h1>章节${req.params.id}</h1><div id="content">正文${req.params.id}</div></body></html>`);
  });

  await new Promise((resolve) => {
    const server = site.listen(0, () => {
      resolve(server);
    });
  });

  const server = site.listen(0);
  return server;
}

async function listen(serverApp) {
  return new Promise((resolve) => {
    const server = serverApp.listen(0, () => resolve(server));
  });
}

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const json = await response.json();
  return { status: response.status, json };
}

(async () => {
  let siteServer;
  let backendServer;

  try {
    const site = express();

    site.get('/search', (req, res) => {
      const key = req.query.key || '';
      res.send(`
        <ul class="book-list">
          <li>
            <span class="name">${key} 小说</span>
            <span class="author">测试作者</span>
            <span class="intro">测试简介</span>
            <span class="kind">玄幻</span>
            <span class="last">第10章</span>
            <span class="word">10万字</span>
            <img src="/cover.jpg" />
            <a class="detail" href="/book/1">详情</a>
          </li>
        </ul>
      `);
    });

    site.get('/book/1', (_req, res) => {
      res.send(`
        <h1 id="book-title">测试小说</h1>
        <p class="author">测试作者</p>
        <p class="intro">一本用于本地测试的小说</p>
        <p class="kind">轻小说</p>
        <p class="last">第20章</p>
        <p class="wordcount">20万字</p>
        <img id="cover" src="/cover.jpg" />
        <a id="toc" href="/book/1/toc">目录</a>
      `);
    });

    site.get('/book/1/toc', (req, res) => {
      const page = Number(req.query.page || 1);
      if (page === 1) {
        res.send(`
          <ul class="toc-list">
            <li><a href="/book/1/chapter/1">第一章</a><span class="vip">false</span></li>
            <li><a href="/book/1/chapter/2">第二章</a><span class="vip">false</span></li>
          </ul>
          <a class="next" href="/book/1/toc?page=2">下一页</a>
        `);
        return;
      }

      res.send(`
        <ul class="toc-list">
          <li><a href="/book/1/chapter/3">第三章</a><span class="vip">true</span></li>
        </ul>
      `);
    });

    site.get('/book/1/chapter/1', (_req, res) => {
      res.send(`
        <h1>第一章</h1>
        <div id="content"><p>广告文字这是正文A。</p></div>
        <a class="next-content" href="/book/1/chapter/1-2">下一页</a>
      `);
    });

    site.get('/book/1/chapter/:id', (req, res) => {
      res.send(`<h1>章节${req.params.id}</h1><div id="content">正文${req.params.id}</div>`);
    });

    siteServer = await listen(site);
    backendServer = await listen(app);

    const siteBase = `http://127.0.0.1:${siteServer.address().port}`;
    const apiBase = `http://127.0.0.1:${backendServer.address().port}`;

    const source = {
      bookSourceUrl: `${siteBase}`,
      bookSourceName: '本地测试源',
      bookSourceType: 0,
      enabled: true,
      searchUrl: `${siteBase}/search?key={{key}}&page={{page}}`,
      ruleSearch: {
        bookList: '@css:.book-list > li',
        name: '@css:.name@text',
        author: '@css:.author@text',
        intro: '@css:.intro@text',
        kind: '@css:.kind@text',
        lastChapter: '@css:.last@text',
        coverUrl: '@css:img@src',
        bookUrl: '@css:a.detail@href',
        wordCount: '@css:.word@text',
      },
      ruleBookInfo: {
        name: 'id.book-title@text',
        author: 'class.author.0@text',
        intro: 'class.intro.0@text',
        kind: 'class.kind.0@text',
        lastChapter: 'class.last.0@text',
        coverUrl: 'id.cover@src',
        tocUrl: 'id.toc@href',
        wordCount: 'class.wordcount.0@text',
      },
      ruleToc: {
        chapterList: '@css:.toc-list > li',
        chapterName: '@css:a@text',
        chapterUrl: '@css:a@href',
        isVip: '@css:.vip@text',
        nextTocUrl: '@css:a.next@href',
      },
      ruleContent: {
        title: '@css:h1@text',
        content: '@css:#content@html',
        nextContentUrl: '@css:a.next-content@href',
        replaceRegex: '广告文字##',
      },
    };

    const imported = await request(apiBase, '/api/sources/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([source]),
    });
    assert.equal(imported.status, 200);
    assert.equal(imported.json.imported, 1);

    const searchRes = await request(
      apiBase,
      `/api/search?keyword=${encodeURIComponent('斗罗')}&sourceId=${encodeURIComponent(siteBase)}`,
    );
    assert.equal(searchRes.status, 200);
    assert.ok(Array.isArray(searchRes.json.results));
    assert.equal(searchRes.json.results.length, 1);
    assert.equal(searchRes.json.results[0].name, '斗罗 小说');

    const bookUrl = searchRes.json.results[0].bookUrl;
    const infoRes = await request(
      apiBase,
      `/api/book/info?sourceId=${encodeURIComponent(siteBase)}&bookUrl=${encodeURIComponent(bookUrl)}`,
    );
    assert.equal(infoRes.status, 200);
    assert.equal(infoRes.json.name, '测试小说');
    assert.ok(infoRes.json.tocUrl.includes('/book/1/toc'));

    const tocRes = await request(
      apiBase,
      `/api/book/toc?sourceId=${encodeURIComponent(siteBase)}&tocUrl=${encodeURIComponent(infoRes.json.tocUrl)}`,
    );
    assert.equal(tocRes.status, 200);
    assert.equal(tocRes.json.chapters.length, 3);
    assert.equal(tocRes.json.chapters[2].isVip, true);

    const contentRes = await request(
      apiBase,
      `/api/book/content?sourceId=${encodeURIComponent(siteBase)}&chapterUrl=${encodeURIComponent(
        tocRes.json.chapters[0].url,
      )}`,
    );
    assert.equal(contentRes.status, 200);
    assert.equal(contentRes.json.title, '第一章');
    assert.ok(contentRes.json.content.includes('这是正文A'));
    assert.ok(!contentRes.json.content.includes('广告文字'));
    assert.ok(contentRes.json.nextContentUrl.includes('/book/1/chapter/1-2'));

    console.log('local-test passed');
    process.exit(0);
  } catch (error) {
    console.error('local-test failed:', error);
    process.exit(1);
  } finally {
    if (siteServer) siteServer.close();
    if (backendServer) backendServer.close();
  }
})();
