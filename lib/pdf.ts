const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_EDGE_PX = 1600
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

// Toutes les pages sont envoyées au modèle : une incohérence entre la page 1
// et la page 2 — un numéro de facture qui change en cours de document — est
// invisible tant que les pages sont analysées séparément ou ignorées.
// Le plafond borne le coût et la latence d'une analyse ; au-delà, les pages
// excédentaires ne sont pas rendues et l'interface le dit.
export const MAX_ANALYZED_PAGES = 6

export type DocumentPrepErrorCode =
  | 'UNSUPPORTED_TYPE'
  | 'TOO_LARGE'
  | 'UNREADABLE_PDF'
  | 'UNREADABLE_IMAGE'

export class DocumentPrepError extends Error {
  code: DocumentPrepErrorCode

  constructor(code: DocumentPrepErrorCode, message: string) {
    super(message)
    this.name = 'DocumentPrepError'
    this.code = code
  }
}

export interface PreparedPage {
  dataUrl: string
  width: number
  height: number
}

export interface PreparedDocument {
  // Pages effectivement rendues, dans l'ordre du document.
  pages: PreparedPage[]
  fileName: string
  // Nombre de pages du fichier d'origine, qui peut dépasser pages.length
  // lorsque le plafond s'applique.
  pageCount: number
}

function scaledSize(width: number, height: number) {
  const longestEdge = Math.max(width, height)
  const ratio = longestEdge > MAX_EDGE_PX ? MAX_EDGE_PX / longestEdge : 1
  return { width: Math.round(width * ratio), height: Math.round(height * ratio), ratio }
}

async function prepareImage(file: File): Promise<PreparedDocument> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('image illisible'))
      img.src = objectUrl
    })

    const { width, height } = scaledSize(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('contexte canvas indisponible')
    }
    context.drawImage(image, 0, 0, width, height)

    return {
      pages: [{ dataUrl: canvas.toDataURL('image/png'), width, height }],
      fileName: file.name,
      pageCount: 1,
    }
  } catch {
    throw new DocumentPrepError(
      'UNREADABLE_IMAGE',
      'This image could not be opened. Try another file.',
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function preparePdf(file: File): Promise<PreparedDocument> {
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

    const buffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: buffer }).promise
    const renderedCount = Math.min(pdf.numPages, MAX_ANALYZED_PAGES)

    const pages: PreparedPage[] = []
    for (let pageNumber = 1; pageNumber <= renderedCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)

      const baseViewport = page.getViewport({ scale: 1 })
      const { ratio } = scaledSize(baseViewport.width, baseViewport.height)
      // On rend au-delà de la taille cible puis on laisse le ratio ramener à
      // MAX_EDGE_PX : un rendu direct à l'échelle 1 produirait un texte trop
      // dégradé pour être lu par le modèle.
      const viewport = page.getViewport({ scale: ratio * 2 })

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('contexte canvas indisponible')
      }

      await page.render({ canvasContext: context, viewport }).promise

      pages.push({
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      })
    }

    return { pages, fileName: file.name, pageCount: pdf.numPages }
  } catch {
    throw new DocumentPrepError(
      'UNREADABLE_PDF',
      'This PDF could not be read. It may be protected or damaged.',
    )
  }
}

export async function prepareDocument(file: File): Promise<PreparedDocument> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new DocumentPrepError(
      'UNSUPPORTED_TYPE',
      'Unsupported format. Drop a PDF, JPG or PNG file.',
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentPrepError(
      'TOO_LARGE',
      'File too large. The maximum size is 10 MB.',
    )
  }

  return file.type === 'application/pdf' ? preparePdf(file) : prepareImage(file)
}
