import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { ReservationReport } from "../../../types/reports";
import {
  createReportChart,
  reportDate,
  type ReportGraph,
} from "./report-charts";

const title = "Reporte de reservas";

export async function reportDocument(
  format: "docx" | "pdf",
  report: ReservationReport,
  graphs: ReportGraph[],
) {
  await document.fonts.ready;
  const charts = graphs.map((graph) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 380;
    const chart = createReportChart(canvas, graph, false);
    try {
      return {
        title: graph.title,
        description: graph.description,
        image: chart.toBase64Image(),
      };
    } finally {
      chart.destroy();
    }
  });
  const period = `${reportDate(report.from)} – ${reportDate(report.to)} · Hora de Perú`;
  const total = `${new Intl.NumberFormat("es-PE").format(report.total)} ${
    report.total === 1 ? "reserva confirmada" : "reservas confirmadas"
  }`;
  const metadata = [report.hotelName, period, total];
  return format === "docx" ? word(metadata, charts) : pdf(metadata, charts);
}

type ImageChart = { title: string; description: string; image: string };

async function word(metadata: string[], charts: ImageChart[]) {
  const { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } =
    await import("docx");
  const children = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 180 },
    }),
    ...metadata.map((text) => new Paragraph({ text, spacing: { after: 100 } })),
    ...charts.flatMap((chart, index) => [
      new Paragraph({
        children: [
          new TextRun({
            text: chart.title,
            bold: true,
            size: 28,
            color: "000000",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index === 2,
        keepNext: true,
        spacing: { before: 180, after: 80 },
      }),
      new Paragraph({
        text: chart.description,
        keepNext: true,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: chart.image,
            transformation: { width: 630, height: 239 },
            altText: {
              title: chart.title,
              description: chart.description,
              name: chart.title,
            },
          }),
        ],
      }),
    ]),
  ];
  return Packer.toBlob(
    new Document({
      title,
      styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 820, right: 870, bottom: 820, left: 870 },
            },
          },
          children,
        },
      ],
    }),
  );
}

async function pdf(metadata: string[], charts: ImageChart[]) {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  pdfMake.addVirtualFileSystem(fonts);
  const content: Content[] = [
    { text: title, fontSize: 24, bold: true, margin: [0, 0, 0, 12] },
    ...metadata.map((text) => ({ text, marginBottom: 4 })),
    ...charts.map(
      (chart, index): Content => ({
        pageBreak: index === 2 ? "before" : undefined,
        margin: [0, 16, 0, 0],
        stack: [
          { text: chart.title, fontSize: 14, bold: true, marginBottom: 5 },
          { text: chart.description, marginBottom: 8 },
          { image: chart.image, width: 500 },
        ],
      }),
    ),
  ];
  const definition: TDocumentDefinitions = {
    info: { title },
    pageSize: "A4",
    pageMargins: [42, 42, 42, 42],
    defaultStyle: { fontSize: 11 },
    content,
  };
  return pdfMake.createPdf(definition).getBlob();
}
