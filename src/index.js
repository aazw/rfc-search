import path from "path";
import fs, { readdir } from "fs/promises";

import marked from "marked";
import { Command } from "commander/esm.mjs";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

async function readRFCIndexTextFile(dirPath, filename = "/rfc-index.txt") {
  const filePath = path.join(dirPath, filename);
  const regex = new RegExp(/^[0-9]{1,5} [\s\S]+$/);
  const rfcs = []; // [ { id: "RFCXXXX", title: "xxx", author: "xxx", date: "xxx" }, ... ]

  try {
    const content = await fs.readFile(filePath, "utf8");
    const splitted = content.split(/(\r?\n){2}/).filter(function (el) {
      return el;
    });

    for (const val of splitted) {
      const result = val.match(regex);
      if (result !== null) {
        let ret = result[0];
        ret = ret.replace(/\r?\n/g, " ");
        ret = ret.replace(/ {2,}/g, " ");

        const spaceIndex = ret.indexOf(" ");
        const rfcID =
          "RFC" + ret.substr(0, spaceIndex).replace(/^0+/, "").toUpperCase();
        const rfcTitleString = ret
          .substr(spaceIndex + 1)
          .replace(/\(Format: ((PDF|HTML|TXT|XML)(, )?)+\) .*/, "")
          .trim();

        if (rfcTitleString === "Not Issued.") {
          rfcs.push({
            id: rfcID,
            notIssued: true,
          });
        } else {
          const dotIndex = rfcTitleString.indexOf(". ");
          const rfcTitle = rfcTitleString.substr(0, dotIndex);
          let rfcAuthor = rfcTitleString
            .substr(dotIndex + 2)
            .replace(
              / (January|February|March|April|May|June|July|August|September|October|November|December) [1-2][0-9]{3}\.$/,
              ""
            );
          let rfcDate = rfcTitleString
            .substr(dotIndex + 2)
            .substr(rfcAuthor.length + 1);
          rfcAuthor = rfcAuthor.replace(/\.$/, "");
          rfcDate = rfcDate.replace(/\.$/, "");

          rfcs.push({
            id: rfcID,
            title: rfcTitle,
            author: rfcAuthor,
            date: rfcDate,
          });
        }
      }
    }

    rfcs.sort(function (a, b) {
      return collator.compare(a.id, b.id);
    });
    return rfcs;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function getLinksFromRFCTextFiles(dirPath) {
  const regex = new RegExp(/RFC[1-9]([0-9]{1,3})?/, "ig");

  const links = []; // [ {source: "RFCXXXX", target: "RFCXXXX"}, ... ]
  try {
    const files = await readdir(dirPath);
    for (const file of files) {
      if (file.endsWith(".txt")) {
        const matches1 = file.match(regex);
        if (matches1?.length > 0) {
          const currentRfc = matches1[0].toUpperCase();
          const filePath = path.join(dirPath, file);
          const content = await fs.readFile(filePath, "utf-8");
          let matches2;
          while ((matches2 = regex.exec(content)) !== null) {
            const targetRfc = matches2[0].toUpperCase();
            // console.log(`Link Found: ${currentRfc} > ${targetRfc}`);
            if (currentRfc !== targetRfc) {
              links.push({
                source: currentRfc,
                target: targetRfc,
              });
            }
          }
        }
      }
    }

    return links;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function writeResultToHTML(
  rfcs = [],
  links = [],
  outputFilePath = "./output/index.html"
) {
  let md = "";
  md += "| RFC    | Title   | Publish Date | Refers to | Referd from |\n";
  md += "|--------|---------|--------------|-----------|-------------|\n";

  for (const rfc of rfcs) {
    let referTo = [];
    let referedFrom = [];
    for (const link of links) {
      if (link.source === rfc.id && link.target !== rfc.id) {
        referTo.push(link.target);
      }
      if (link.target === rfc.id) {
        referedFrom.push(link.source);
      }
    }

    referTo = [...new Set(referTo)].sort(collator.compare);
    referedFrom = [...new Set(referedFrom)].sort(collator.compare);
    md += `|<a id="${
      rfc.id
    }" href="https://www.rfc-editor.org/info/${rfc.id.toLowerCase()}">${
      rfc.notIssued ? "~~" : ""
    }${rfc.id}${rfc.notIssued ? "~~" : ""}</a>|${rfc.title ?? ""}|${
      rfc.date ?? ""
    }|${referTo
      ?.map((el) => `<a href="#${el}">${el}</a>`)
      .join(", ")}|${referedFrom
      ?.map((el) => `<a href="#${el}">${el}</a>`)
      .join(", ")}|\n`;
  }

  const html = `
<!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>RFC List</title>
      <meta name="description" content="">
      <meta name="author" content="">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css" integrity="sha512-Oy18vBnbSJkXTndr2n6lDMO5NN31UljR8e/ICzVPrGpSud4Gkckb8yUpqhKuUNoE+o9gAb4O/rAxxw1ojyUVzg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <style>
        html, body {
          padding: 0px;
          margin: 0px;
          overflow-y: scroll;
        }
        
        html::-webkit-scrollbar {
          width: 8px;
        }

        html::-webkit-scrollbar-thumb {
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
        }

      	.markdown-body {
      	}

        .markdown-body table tr > *:nth-child(2) {
          width: 40%;
        }

        .markdown-body table tr > *:nth-child(4),
        .markdown-body table tr > *:nth-child(5) {
          width: 20%;
        }
      </style>
      </head>
    <body>
      <div class="markdown-body">
        ${marked(md)}
      </div
    </body>
</html>
`;

  try {
    await fs.writeFile(outputFilePath, html.trim());
  } catch(err) {
    console.error(err);
    throw err;
  }
}

async function main() {
  const program = new Command();
  program
    .option(
      "--rfcDirPath <rfcDirPath>",
      "directory path which rfc files exist",
      "./rfc"
    )
    .option(
      "--htmlOutputFilePath <htmlOutputFilePath>",
      "file path which html file will be exported",
      "./docs/index.html"
    );
  program.parse(process.argv);
  const options = program.opts();

  const rfcDirPath = options.rfcDirPath;
  const htmlOutputFilePath = options.htmlOutputFilePath;

  const rfcs = await readRFCIndexTextFile(rfcDirPath);

  const links = await getLinksFromRFCTextFiles(rfcDirPath);

  await writeResultToHTML(rfcs, links, htmlOutputFilePath);
}
main();
