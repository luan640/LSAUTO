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

  // Usa as dimensões do próprio canvas (já na escala 2x) tanto pra página
  // quanto pra imagem — assim não depende de nenhuma conversão de DPI do
  // jsPDF para a unidade "px", que historicamente é inconsistente e cortava
  // a borda direita do recibo.
  const width = canvas.width;
  const height = canvas.height;

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
  pdf.save(filename);
}
