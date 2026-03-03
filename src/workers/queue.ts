import * as fastq from "fastq";

type Task = {
  executionId: string;
  monitorId: string;
  url: string;
};

async function worker(task: Task) {
  const { analyzeWebsite } = await import("./analyzer");
  await analyzeWebsite(task.executionId, task.monitorId, task.url);
}

export const analysisQueue = fastq.promise(worker, 2);

console.log("[Queue] Local Worker Queue initialized (Concurrency: 2)");