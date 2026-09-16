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
  // imagem, não define o tamanho da página). O recibo é escalado pra caber
  // inteiro dentro da margem, preservando a proporção — assim ele sempre
  // imprime numa página só, independente do tamanho em pixels do template na
  // tela ou das configurações de impressão do visualizador.
  const imageAspectRatio = canvas.width / canvas.height;
  const pdf = new jsPDF({
    orientation: imageAspectRatio >= 1 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 10;
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const maxHeight = pdf.internal.pageSize.getHeight() - margin * 2;

  let renderWidth = maxWidth;
  let renderHeight = renderWidth / imageAspectRatio;
  if (renderHeight > maxHeight) {
    renderHeight = maxHeight;
    renderWidth = renderHeight * imageAspectRatio;
  }

  const x = margin + (maxWidth - renderWidth) / 2;
  const y = margin + (maxHeight - renderHeight) / 2;

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, renderWidth, renderHeight);
  pdf.save(filename);
}
