export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error("Failed to copy to clipboard:", e);
    throw e;
  }
}

export async function pasteFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch (e) {
    console.error("Failed to paste from clipboard:", e);
    return "";
  }
}

export async function copyImageToClipboard(imageData: Uint8Array): Promise<void> {
  try {
    const blob = new Blob([imageData], { type: "image/png" });
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
  } catch (e) {
    console.error("Failed to copy image to clipboard:", e);
    throw e;
  }
}

export function setupClipboardSync(
  onPaste: (text: string) => void
): () => void {
  const handlePaste = async (e: ClipboardEvent) => {
    const text = await pasteFromClipboard();
    if (text) {
      onPaste(text);
    }
  };
  
  document.addEventListener("paste", handlePaste);
  
  return () => {
    document.removeEventListener("paste", handlePaste);
  };
}
