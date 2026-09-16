// Espera todas as <img> dentro do nó terminarem de carregar (ex.: a logo),
// pra não capturar o recibo com imagem quebrada na primeira geração.
function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  return Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

// Renderiza um nó do DOM (o template do recibo) como imagem e monta um PDF do
// mesmo tamanho, baixando o arquivo no navegador. Carregado sob demanda (import
// dinâmico) porque html2canvas-pro/jsPDF só são usados aqui, ao emitir um recibo.
export async function renderNodeToPdf(node: HTMLElement, filename: string) {
  const [{ default: html2canvas }] = await Promise.all([
    import("html2canvas-pro"),
    waitForImages(node),
  ]);
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
  });

  // Página em tamanho A4 fixo (a escala 2x do canvas serve só pra nitidez da
  // imagem, não define o tamanho da página). O recibo ocupa só a metade
  // superior da folha, preservando a proporção, deixando a metade de baixo em
  // branco com uma linha pontilhada — dá pra cortar e sobra um recibo do
  // tamanho de meia A4 em vez de folha inteira.
  const imageAspectRatio = canvas.width / canvas.height;
  const pdf = new jsPDF({
    orientation: imageAspectRatio >= 1 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight / 2 - margin * 1.5;

  let renderWidth = maxWidth;
  let renderHeight = renderWidth / imageAspectRatio;
  if (renderHeight > maxHeight) {
    renderHeight = maxHeight;
    renderWidth = renderHeight * imageAspectRatio;
  }

  const x = margin + (maxWidth - renderWidth) / 2;
  const y = margin;

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, renderWidth, renderHeight);

  const cutY = pageHeight / 2;
  pdf.setDrawColor(180);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.line(margin, cutY, pageWidth - margin, cutY);
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text("corte aqui", pageWidth / 2, cutY - 2, { align: "center" });

  pdf.save(filename);
}
