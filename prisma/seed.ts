import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'text-embedding-004',
  });

  const wb = XLSX.readFile('./prisma/products.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws);
  if (!rows.length) return;

  const take = Math.max(1, Math.ceil(rows.length * 0.1));
  const sampled = rows
    .map((r) => ({ ...r, rand: Math.random() }))
    .sort((a, b) => a.rand - b.rand)
    .slice(0, take);

  const now = new Date();
  for (const r of sampled) {
    const embeddingVector = await embeddings.embedQuery(
      `${r['TIPO_PRENDA']} ${r['TALLA']} ${r['COLOR']} ${r['CATEGORÍA']} ${r['DESCRIPCIÓN']}`,
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Product"
   (id, name, description, price_50, price_100, price_200, stock, available, embedding, "createdAt", "updatedAt")
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10,$11)`,
      r['ID'],
      `${r['TIPO_PRENDA']} ${r['TALLA']} ${r['COLOR']} ${r['CATEGORÍA']}`,
      r['DESCRIPCIÓN'],
      Number(r['PRECIO_50_U']),
      Number(r['PRECIO_100_U']),
      Number(r['PRECIO_200_U']),
      Number(r['CANTIDAD_DISPONIBLE']),
      r['DISPONIBLE'] !== 'No',
      embeddingVector,
      now,
      now,
    );
  }

  console.log(`Cargados ${take}/${rows.length} productos (10%).`);

  // await prisma.$executeRawUnsafe(`
  //   CREATE INDEX IF NOT EXISTS product_fulltext_idx
  //   ON "Product"
  //   USING GIN (to_tsvector('spanish', name || ' ' || description));
  // `);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
