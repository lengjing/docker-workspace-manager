import { NextRequest, NextResponse } from "next/server";
import { AppDataSource } from "@/lib/data-source";
import { Storage } from "@/lib/entities/Storage";

export async function GET() {
  const repo = AppDataSource.getRepository(Storage);
  const all = await repo.find();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  const repo = AppDataSource.getRepository(Storage);

  const storage = repo.create({
    ...body,
    createdAt: new Date(),
  });

  await repo.save(storage);
  return NextResponse.json(storage);
}
