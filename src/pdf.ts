import fs from "fs";

const pdf: any = require("pdf-creator-node");

const tokenSize: any = {
  gargantuan: 8,
  huge: 6,
  large: 4,
  medium: 2,
  small: 2,
  tiny: 1,
};

function sort(tokens: any[]) {
  const sortedTokens = tokens.sort(
    (a, b) => tokenSize[b.size] - tokenSize[a.size]
  );

  return sortedTokens;
}

function fill(page: any[], tokens: any[], x: number, y: number) {
  const tokenIndex = tokens.findIndex(
    (token) => tokenSize[token.size] <= x && tokenSize[token.size] <= y
  );

  if (tokenIndex >= 0) {
    const token = tokens.splice(tokenIndex, 1)[0];
    page.push(token);
    fill(page, tokens, x - tokenSize[token.size], tokenSize[token.size]);
    fill(page, tokens, x, y - tokenSize[token.size]);
  }

  return [page, tokens];
}

function batchTokens(tokens: any[]) {
  const batchedTokens: any[] = [];

  while (tokens.length > 0) {
    const [page, tokensLeft] = fill([], tokens, 16, 22);
    tokens = tokensLeft;
    batchedTokens.push(page);
  }

  return batchedTokens;
}

function createPdf(filename: string, tokens: any[]) {
  const html = fs.readFileSync("combat_token_template.html", "utf8");

  const options = {
    format: "A4",
    orientation: "portrait",
    border: "0",
    header: { height: "0", contents: null },
    footer: { height: "0", contents: null },
  };

  const document = {
    html,
    data: { batches: tokens },
    path: `./${filename}.pdf`,
    type: "pdf",
  };

  pdf
    .create(document, options)
    .then((res: any) => {
      console.log(res);
    })
    .catch((error: Error) => {
      console.error(error);
    });
}

async function main() {
  if (process.argv.length > 2) {
    const filename = process.argv[2];

    fs.readFile(filename, "utf8", function (err, data) {
      if (err) throw err;
      const tokens = JSON.parse(data);
      const sortedTokens = sort(tokens);
      const batchedTokens = batchTokens(sortedTokens);
      createPdf(filename.replace(/\.[^/.]+$/, ""), batchedTokens);
    });
  } else {
    throw new Error("filename required");
  }
}

main();
