import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (fileName.endsWith(".pdf")) {
      // Parse PDF using LangChain PDFLoader
      const blob = new Blob([buffer], { type: "application/pdf" });
      const loader = new PDFLoader(blob);
      const docs = await loader.load();
      text = docs.map(doc => doc.pageContent).join("\n\n");
    } else if (fileName.endsWith(".txt")) {
      // Parse TXT
      text = buffer.toString("utf-8");
    } else if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
      // Parse DOC/DOCX
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("File parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}
