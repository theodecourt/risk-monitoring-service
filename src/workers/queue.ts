import * as fastq from "fastq";
import type { promiseWorker } from "fastq";
import { analyzeWebsite } from "./analyzer";

type Task = {
  executionId: string;
  monitorId: string;
  url: string;
};

const worker: promiseWorker<Task> = async (task) => {
  await analyzeWebsite(task.executionId, task.monitorId, task.url);
};

export const analysisQueue = fastq.promise(worker, 2);

console.log("[Queue] Local Worker Queue initialized (Concurrency: 2)");