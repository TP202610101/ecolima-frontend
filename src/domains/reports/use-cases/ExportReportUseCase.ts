import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'
import type { CoverageRedundancyItem } from '@/domains/map/repositories/MapRepository'

function incomeToNSE(stratum?: number): string {
  if (stratum == null) return 'N/D'
  if (stratum >= 5) return 'A'
  if (stratum === 4) return 'B'
  if (stratum === 3) return 'C'
  if (stratum === 2) return 'D'
  return 'E'
}

export const ExportReportUseCase = {
  exportCSV(data: Recommendation[], redundancy: CoverageRedundancyItem[] = []) {
    const headers = [
      'Zona',
      'Distrito',
      'NSE',
      'Prioridade',
      'Puntaje ML (%)',
      'Densidad Poblacional (hab/km²)',
      'Brecha Cobertura (km)',
      'Densidad Vial (m/km²)',
      'Estado',
    ]

    const rows = data.map(r => [
      `Zona ${r.zone_id}`,
      r.district_name,
      incomeToNSE(r.income_stratum),
      r.priority_label,
      r.ml_score != null ? (r.ml_score * 100).toFixed(0) : '',
      r.population_density != null ? String(Math.round(r.population_density)) : '',
      r.coverage_gap_m != null ? (r.coverage_gap_m / 1000).toFixed(1) : '',
      r.road_density != null ? String(Math.round(r.road_density)) : '',
      'Recomendado',
    ])

    const csv = (rows2: string[][]): string =>
      rows2.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

    const zonesSection = csv([headers, ...rows])

    const redundancyHeaders = [
      'Distrito',
      'Zonas recomendadas',
      'Zonas cubiertas',
      '% Redundancia',
      'Estado semáforo',
      'Modelo demo',
    ]

    const statusLabel = (item: CoverageRedundancyItem): string => {
      if (item.total_recommended === 0) return 'Sin datos'
      const map: Record<string, string> = { verde: 'Verde (0–50%)', amarillo: 'Amarillo (51–80%)', rojo: 'Rojo (>80%)' }
      return map[item.status] ?? item.status
    }

    const redundancyRows = redundancy
      .slice()
      .sort((a, b) => b.redundancy_pct - a.redundancy_pct || a.district_name.localeCompare(b.district_name, 'es'))
      .map(item => [
        item.district_name,
        String(item.total_recommended),
        String(item.already_covered),
        item.total_recommended > 0 ? item.redundancy_pct.toFixed(2) : '',
        statusLabel(item),
        item.is_demo ? 'Sí' : 'No',
      ])

    const redundancySection = [
      '',
      '',
      '"--- Redundancia de cobertura por distrito ---"',
      csv([redundancyHeaders, ...redundancyRows]),
    ].join('\n')

    const csvContent = redundancy.length > 0
      ? zonesSection + redundancySection
      : zonesSection

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ecolima-reporte-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  exportPDF() {
    window.print()
  },
}