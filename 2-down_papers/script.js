const http = require('http');
const https = require('https');
const fs = require('fs');
const parse = require('csv-parse');
const CDP = require('chrome-remote-interface');


const input_file_path ='../1-get_author_paper_list/aaai2.csv';
const fileContents = fs.readFileSync(input_file_path);
const lines = fileContents.toString().trim().split('\n');
const BASE_URL = 'http://www.aaai.org/Library/AAAI/';


var file_set = new Set();
const pdfs_uris  = [];
const paper_titles = [];

lines.forEach((line) => {
  parse(line, (err, output) => {
    if (err) {
      console.error(`NON-STANDARD LINE: ${line}`);
    } else {
      const cols = output[0];
      if (cols[4] > '2002') {
        if (!file_set.has(cols[3])) {
          file_set.add(cols[3]);
          pdfs_uris.push(cols[3]);
          paper_titles.push(cols[2]);
        }
      }
    }
  });
});


const pdfs_urls = [];
CDP(async(client) => {
  const {Network, Page, Runtime} = client;

  try {
    await Network.enable();
    await Page.enable();
    await Network.setCacheDisabled({cacheDisabled: true});

    for (let i = 0; i < pdfs_uris.length; i++) {
      if (pdfs_uris[i].startsWith('http')) {
        pdf_uri = pdfs_uris[i].replace('view', 'viewPaper').replace('http', 'https');
        await Page.navigate({url: pdf_uri});
        await Page.loadEventFired();

        const step_get_url = `document.querySelector('#paper').getElementsByTagName("a")[0].attributes.href.value`;
        const result = await Runtime.evaluate({ expression: step_get_url });
        const file_url = result.result.value;
        console.log(file_url);
        pdfs_urls.push(file_url);
      } else {
        console.log('http://www.aaai.org/Papers/AAAI/' + pdfs_uris[i].slice(0, -4).trim('../').toUpperCase() + '.pdf');
        pdfs_urls.push('http://www.aaai.org/Papers/AAAI/' + pdfs_uris[i].slice(0, -4).trim('../').toUpperCase() + '.pdf');
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.close();
    let cnt = 0;
    const nIntervId = setInterval(() => {
      if (cnt < pdfs_urls.length) {
        if (pdfs_urls[cnt] !== undefined && pdfs_urls[cnt].length > 0) {
          download_pdf(pdfs_urls[cnt], paper_titles[cnt]);
          console.log(`${pdfs_urls[cnt]} downloaded`)
        }
        cnt = cnt + 1;
      } else {
        clearInterval(nIntervId);
      }
    }, 250);
  }
}).on('error', (err) => {
  console.error(err);
});

function download_pdf(file_url, paper_title) {
  try {
    var file = fs.createWriteStream('./papers/' + paper_title.replace(/\//g, "%2F") + '.pdf');
    if (file_url.startsWith('https')) {
      var request = https.get(file_url.replace('view', 'viewFile'), function(response) {
        response.pipe(file);
      });
    } else {
      var request = http.get(file_url, function(response) {
        response.pipe(file);
      });
    }
  } catch (err) {
    console.error(err);
  }
}
