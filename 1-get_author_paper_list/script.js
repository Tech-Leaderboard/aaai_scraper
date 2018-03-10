const CDP = require('chrome-remote-interface');
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

        var urls = [];
        var years = [];
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

        console.log("author_name, affiliation, paper_title, paper_url, year_of_conference")
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
            const paper_title = res1.result.value.replace(/"/g, '""').replace(/(\r\n|\n|\r)/g, ' ');
            if (INVALID_TITLES.has(paper_title)) continue

            const step_paper_url = `document.querySelector('#box6').querySelectorAll("p.left")[${j}].querySelector("a").attributes.href.value`;
            const res2 = await Runtime.evaluate({ expression: step_paper_url });
            const paper_url = res2.result.value;

            const step_authors = `document.querySelector('#box6').querySelectorAll("p.left")[${j}].querySelector('i').textContent`;
            const res3 = await Runtime.evaluate({ expression: step_authors });
            if (!res3.result.value) continue
            var res3_text = res3.result.value.replace(/(\r\n|\n|\r)/g, ' ');

            if (year > 2002) {
              const authors_names = res3_text.split(/,\sand\s|\sand\s|,\s/);

              for (let k = 0; k < authors_names.length; k++) {
                console.log(`"${authors_names[k].trim()}",,"${paper_title.trim()}",${paper_url},${year}`);
              }
            } else {
              if (res3_text.includes(";")) {
                const authors_recs = res3_text.split(';');
                for (let l = 0; l < authors_recs.length; l++) {
                  var authors_names = authors_recs[l].split(',');
                  var aff_start = authors_names.length - 1;
                  for (let ll = 0; ll < authors_names.length; ll++) {
                    const lower_cpy = authors_names[ll].toLowerCase();
                    if (lower_cpy.includes('research') || lower_cpy.includes('lab') || lower_cpy.includes('university') || lower_cpy.includes('ltd')) {
                      aff_start = ll;
                      break;
                    }
                  }
                  if (year == 2002) {
                    console.error("before deleting affiliation:")
                    console.error(authors_names)
                  }

                  const affiliation = authors_names.slice(aff_start).join(', ')
                  while(authors_names.length > aff_start) {
                    authors_names.pop();
                  }
                  if (year == 2002) {
                    console.error("after deleting affiliation:")
                    console.error(authors_names)
                  }

                  if (authors_names.length > 0 && authors_names[authors_names.length - 1].includes(' and ')) {
                    var last_item = authors_names[authors_names.length - 1];
                    authors_names.pop();
                    var last_items = last_item.split(' and ');
                    if (last_items[0] == 0) {
                      last_items.shift();
                    }
                    authors_names = authors_names.concat(last_items);
                    if (year == 2002) {
                      console.error("after spilting:")
                      console.error(authors_names)
                    }
                  }

                  for (let ll = 0; ll < authors_names.length; ll++) {
                    console.log(`"${authors_names[ll].trim()}","${affiliation}","${paper_title.trim()}",${paper_url},${year}`);
                  }
                  if (authors_names.length == 0) {
                    console.log(`,"${affiliation}","${paper_title.trim()}",${paper_url},${year}`);
                  }
                }
              } else {
                var authors_names = res3_text.split(',');
                var aff_start = authors_names.length - 1;
                for (let l = 0; l < authors_names.length; l++) {
                  const lower_cpy = authors_names[l].toLowerCase();
                  if (lower_cpy.includes('research') || lower_cpy.includes('lab') || lower_cpy.includes('universit')) {
                    aff_start = l;
                    break;
                  }
                }

                const affiliation = authors_names.slice(aff_start).join(', ')
                while(authors_names.length > aff_start) {
                  authors_names.pop();
                }

                try {
                  var last_item = authors_names.pop();
                  var last_items = last_item.split('and');
                  authors_names.concat(last_items)

                  for (let l = 0; l < authors_names.length; l++) {
                    console.log(`"${authors_names[l].trim()}","${affiliation}","${paper_title.trim()}",${paper_url},${year}`);
                  }
                } catch(err) {
                  console.error(`"${res3_text}","","${paper_title.trim()}",${paper_url},${year}`)
                }
              }
            }
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
