// lib/jobs/company-jobs.ts
import type { Company } from "@prisma/client"
import { runSeedJob } from "@/lib/microservice/jobs/seed-job"
import { runRadarJob } from "@/lib/microservice/jobs/radar-job"
import { runBountyJob } from "@/lib/microservice/jobs/bounty-jobs"

export async function seedCompany(company: Company) {
    return runSeedJob(company.id)
}

export async function refreshCompanyRadar(company: Company) {
  return runRadarJob(company.id)
}

export async function refreshCompanyBounty(company: Company) {
  return runBountyJob(company.id)
}