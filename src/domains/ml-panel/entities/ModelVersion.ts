// Versiones del paquete de resultados importado (GET /api/v1/analisis/versiones).
// El Panel ML ya no gestiona modelos entrenados en la plataforma: lee los paquetes versionados.
import type { ModeloV1, VersionActiva } from '@/domains/analisis-v1/entities/AnalisisV1'

export interface VersionResumen {
  paquete_version: string
  dataset_version: string
  modelo_version: string
  mcda_version: string
  fecha_paquete: string
  descripcion: string
  licencia_datos: string
  activa: boolean
  importado_en: string
  manifest_sha256: string
}

export interface ListaVersiones {
  activa: string | null
  versiones: VersionResumen[]
}

/** Una versión con su ficha de modelo, para compararla con otra. */
export interface VersionComparada {
  version: VersionActiva
  modelo: ModeloV1 | null
}
