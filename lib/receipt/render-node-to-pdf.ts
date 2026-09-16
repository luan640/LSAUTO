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

  const scale = 2;
  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: "#ffffff",
  });

  // A página do PDF usa o tamanho "real" do recibo (sem a escala 2x, que serve
  // só pra deixar a imagem mais nítida). Usar o canvas em escala 2x direto como
  // tamanho de página deixava o PDF com o dobro do tamanho em cada dimensão —
  // ao imprimir sem "ajustar à página", só o canto superior esquerdo cabia na
  // folha.
  const width = canvas.width / scale;
  const height = canvas.height / scale;

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
  pdf.save(filename);
}
