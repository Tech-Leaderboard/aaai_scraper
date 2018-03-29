const CDP = require('chrome-remote-interface');
const stringify = require('csv-stringify');
const fs = require('fs');

const BASE_URL = 'http://www.aaai.org/Library/AAAI/';
const INVALID_TITLES = new Set(['AAAI Preface', 'IAAI Preface', 'Invited Talks', 'AAAI Organization']);

// scrape http://www.aaai.org/Library/AAAI
CDP(async(client) => {
    const {Network, Page, Runtime} = client;

    try {
        await Network.enable();
        await Page.enable();
        await Network.setCacheDisabled({cacheDisabled: true});
        await Page.navigate({url: `${BASE_URL}aaai-library.php`});
        await Page.loadEventFired();

        const step_get_urls_cnt = `document.querySelector('.content').getElementsByTagName("li").length`;
        const result = await Runtime.evaluate({ expression: step_get_urls_cnt });
        const urls_cnt = result.result.value;
        //console.log(`urls_cnt: ${urls_cnt}`);

        let urls = [];
        let years = [];
        for (let i = 0; i < urls_cnt; i++) {
            const step_get_url = `document.querySelector('#content').getElementsByTagName("li")[${i}].getElementsByTagName("a")[0].attributes.href.value`;
            const res1 = await Runtime.evaluate({ expression: step_get_url });
            // console.log(`i: ${i}, consult: ${result.result.value}`);
            urls.push(res1.result.value)

            const step_get_year = `document.querySelector('#content').getElementsByTagName("li")[${i}].textContent`;
            const res2 = await Runtime.evaluate({ expression: step_get_year });
            const tmp_text = res2.result.value;
            years.push(tmp_text.slice(tmp_text.length - 5, -1))
        }

        for (let i = 0; i < urls_cnt; i++) {
          const url = urls[i];
          const year = years[i];
          await Page.navigate({url: `${BASE_URL}${url}`});
          await Page.loadEventFired();
          const step_get_papers_cnt = `document.querySelector('#box6').querySelectorAll("p.left").length`;
          const result = await Runtime.evaluate({ expression: step_get_papers_cnt });
          const papers_cnt = result.result.value;
          //console.log(`papers_cnt: ${papers_cnt}`)

          for (let j = 0; j < papers_cnt; j++) {
            const step_paper_title = `document.querySelector('#box6').querySelectorAll("p.left")[${j}].querySelector("a").textContent`;
            const res1 = await Runtime.evaluate({ expression: step_paper_title });
            if (!res1.result.value) continue
            const paper_title = res1.result.value.replace(/(\r\n|\n|\r)/g, ' ');
            if (INVALID_TITLES.has(paper_title)) continue

            const step_paper_url = `document.querySelector('#box6').querySelectorAll("p.left")[${j}].querySelector("a").attributes.href.value`;
            const res2 = await Runtime.evaluate({ expression: step_paper_url });
            const paper_url = res2.result.value;

            const step_authors = `document.querySelector('#box6').querySelectorAll("p.left")[${j}].querySelector('i').textContent`;
            const res3 = await Runtime.evaluate({ expression: step_authors });
            if (!res3.result.value) continue
            var res3_text = res3.result.value.replace(/(\r\n|\n|\r)/g, ' ');
            const row = [[res3_text, paper_title, paper_url, year]]
            stringify(row, function(err, output){
              console.log(output.trim());
            });
          }
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.close();
    }
}).on('error', (err) => {
    console.error(err);
});
