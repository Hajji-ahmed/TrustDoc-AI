const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_EDGE_PX = 1600
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

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

export interface PreparedDocument {
  dataUrl: string
  width: number
  height: number
  fileName: string
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
      dataUrl: canvas.toDataURL('image/png'),
      width,
      height,
      fileName: file.name,
      pageCount: 1,
    }
  } catch {
    throw new DocumentPrepError(
      'UNREADABLE_IMAGE',
      "Cette image n'a pas pu être ouverte. Essayez un autre fichier.",
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
    const page = await pdf.getPage(1)

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

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      fileName: file.name,
      pageCount: pdf.numPages,
    }
  } catch {
    throw new DocumentPrepError(
      'UNREADABLE_PDF',
      "Ce PDF n'a pas pu être lu. Il est peut-être protégé ou endommagé.",
    )
  }
}

export async function prepareDocument(file: File): Promise<PreparedDocument> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new DocumentPrepError(
      'UNSUPPORTED_TYPE',
      'Format non pris en charge. Déposez un fichier PDF, JPG ou PNG.',
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentPrepError(
      'TOO_LARGE',
      'Fichier trop volumineux. La taille maximale est de 10 Mo.',
    )
  }

  return file.type === 'application/pdf' ? preparePdf(file) : prepareImage(file)
}
