import { Queue } from "bullmq"
import IORedis from "ioredis"

export const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

export const emailQueue = new Queue("email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export interface EmailJobData {
  to: string
  subject: string
  html: string
  text?: string
  logId?: string
}

export async function addEmailJob(data: EmailJobData): Promise<void> {
  await emailQueue.add("send-email", data)
}
