import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'

function incomeToNSE(stratum?: number): string {
  if (stratum == null) return 'N/D'
  if (stratum >= 5) return 'A'
  if (stratum === 4) return 'B'
  if (stratum === 3) return 'C'
  if (stratum === 2) return 'D'
  return 'E'
}

export const ExportReportUseCase = {
  exportCSV(data: Recommendation[]) {
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

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

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