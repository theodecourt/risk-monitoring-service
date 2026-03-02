import * as fastq from "fastq";
import type { promiseWorker } from "fastq";
import { analyzeWebsite } from "./analyzer";

// Define the shape of our "Message" (The SQS Payload)
type Task = {
  executionId: string;
  monitorId: string;
  url: string;
};

// 1. Define the Worker Task (This is what the worker does when it pulls a message)
const worker: promiseWorker<Task> = async (task) => {
  await analyzeWebsite(task.executionId, task.monitorId, task.url);
};

// 2. Create the Queue
// The '2' is the CONCURRENCY: it tells the system "Only process 2 websites at a time"
// even if 1000 are waiting in the queue. This protects your CPU and Network.
export const analysisQueue = fastq.promise(worker, 2);

console.log("[Queue] Local Worker Queue initialized (Concurrency: 2)");