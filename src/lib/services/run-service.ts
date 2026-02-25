import { prisma } from "@/lib/db";
import { executeRun } from "@/lib/engine";

export async function getRunById(runId: string) {
  return prisma.run.findUnique({
    where: {
      id: runId
    },
    include: {
      session: true,
      userMessage: true,
      steps: {
        orderBy: {
          createdAt: "asc"
        }
      },
      artifacts: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
}

export async function executeRunById(runId: string) {
  return executeRun(runId);
}
