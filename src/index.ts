import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

let count = 0;

const getColour = () => {
  const colours = [
    "#999999", // "gray",
    "#e69f00", // "orange",
    "#56b4e9", // "blue",
    "#009e73", // "green",
    "#f0e442", // "yellow",
    "#0072b2", // "cerulean",
    "#d55e00", // "tenn",
    "#cc79a7", // "pink",
  ];

  const colour = colours[count++];

  count = count % colours.length;

  return colour;
};

const getProperty = async (notion: Client, page: any, propertyName: string) => {
  const propertyId = page.properties[propertyName].id;

  const property = (await notion.pages.properties.retrieve({
    page_id: page.id,
    property_id: propertyId,
  })) as any;

  let propertyValue = property[property.type];

  if ("Image" == propertyName) {
    propertyValue = property[property.type][0].external.url;
  } else if ("Size" == propertyName) {
    propertyValue = property[property.type].name;
  } else if ("Zoom" == propertyName) {
    propertyValue = property[property.type] * 100;
  }

  return propertyValue;
};

const getMonsterImage = async (notion: Client, monsterPageId: any) => {
  const monsterPage = await notion.pages.retrieve({ page_id: monsterPageId });

  const image = await getProperty(notion, monsterPage, "Image");
  const size = await getProperty(notion, monsterPage, "Size");
  const zoom = await getProperty(notion, monsterPage, "Zoom");

  const images = [{ image, size, zoom }];

  return images;
};

const getMonsters = async (notion: Client, page: any) => {
  const monsterId = page.properties.Monsters.id;

  const monsterPages = (
    (await notion.pages.properties.retrieve({
      page_id: page.id,
      property_id: monsterId,
    })) as any
  ).results;

  const monsterImages = await Promise.all(
    monsterPages.map(
      async (monsterPage: any) =>
        await getMonsterImage(notion, monsterPage.relation.id)
    )
  );

  return monsterImages;
};

const getTokens = async (notion: Client, tokenPages: any[]) => {
  const tokens = [] as any[];
  for (const tokenPageIndex in tokenPages) {
    const tokenPage = tokenPages[tokenPageIndex];
    const monsterCount = await getProperty(notion, tokenPage, "Count");
    const monsters = await getMonsters(notion, tokenPage);
    const monstersIncludingDuplicates = monsters.reduce(
      (res: any, current: any) =>
        res.concat(...Array(monsterCount).fill(current)),
      []
    );

    tokens.push(...monstersIncludingDuplicates);
  }

  return tokens.map((token) => {
    return { ...token, colour: getColour() };
  });
};

async function main() {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  const tokensToPrint = (
    await notion.databases.query({
      database_id: process.env.DATABASE_ID!,
      filter: { property: "Print", checkbox: { equals: true } },
    })
  ).results;

  const monsterTokens = await getTokens(notion, tokensToPrint);

  const filename = `combat_tokens_${new Date().toJSON().slice(0, 10)}.json`;

  fs.writeFile(filename, JSON.stringify(monsterTokens, null, 4), (error) => {
    if (error) throw error;
    console.log(`${monsterTokens.length} combat tokens saved in ${filename}`);
  });
}

main();
