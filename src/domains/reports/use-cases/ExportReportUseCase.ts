import { ReportsRepository } from '../repositories/ReportsRepository'

export async function ExportReportUseCase() {
  const data = await ReportsRepository.getRecommendationsReport()
  return data
}
