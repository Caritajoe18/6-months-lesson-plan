# Day 3 — `node-cron`, Queues & Scheduled Data Sync

**Previous:** [Day 2 — API Caching, Rate Limiting & Sessions](day-2-api-caching-rate-limiting-sessions.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Schedule a recurring Node.js task with `node-cron`
- Choose a timezone and understand the limits of an in-process scheduler
- Structure a data-sync job so it can be retried without duplicating effects
- Explain when a Redis-backed queue is more reliable than running work in a cron callback
- Shut down scheduled tasks and workers cleanly
- Add basic logging and operational visibility to background work

---

## 1. Scheduled Tasks and Cron Expressions

Scheduled work includes reports, cleanup, reminders, and synchronization with an external system. A cron expression describes when a task should run. For example:

```text
0 2 * * *    every day at 02:00
*/15 * * * * every 15 minutes
0 9 * * 1    Monday at 09:00
```

Cron implementations may support a seconds field and other extensions. Check the installed package's documentation rather than assuming expressions are interchangeable.

Install `node-cron`:

```bash
npm install node-cron
```

Example scheduled report:

```js
import cron from "node-cron";

const reportTask = cron.schedule(
  "0 2 * * *",
  async () => {
    const startedAt = new Date();
    console.info("Daily report started", { startedAt: startedAt.toISOString() });

    try {
      await generateAndStoreDailyReport();
      console.info("Daily report completed");
    } catch (error) {
      console.error("Daily report failed", error);
      throw error;
    }
  },
  {
    timezone: "UTC",
    noOverlap: true,
  },
);
```

`noOverlap` is available in current `node-cron` versions; verify the option against the version in the project's lockfile. It prevents overlap in that process, not across multiple server replicas.

Keep the callback small: delegate to a service that can also be run manually and tested independently. Use a single agreed timezone, typically UTC for reports and synchronization. A local-time schedule may run differently around daylight-saving changes.

---

## 2. In-Process Scheduler Limits

`node-cron` runs inside a Node process. If the process is stopped at the scheduled time, the task does not run. If every replica starts the same schedule, every replica may run it.

This makes in-process scheduling suitable for a small, single-instance application or a non-critical task with acceptable missed/duplicate execution. For production or multiple replicas, use one of these patterns:

- Run a separate, single scheduler process.
- Use a distributed lock with safe expiration and ownership checks.
- Have a scheduler enqueue work into a durable queue, and let workers process it.
- Use the deployment platform's managed scheduler to trigger a job.

Do not assume `noOverlap` is distributed coordination. A Redis lock also needs careful expiration, ownership, and release behavior; do not build a lock casually when a queue or managed scheduler is available.

---

## 3. Idempotent Scheduled Data Sync

An external API may time out after the remote system accepted a request. Retrying may then repeat the operation. Design a sync job so running it twice does not create duplicate or corrupted data.

Useful techniques:

- **Stable external ID:** upsert using the provider's record ID and a unique database constraint.
- **Checkpoint/cursor:** save the last successfully completed page, timestamp, or provider cursor.
- **Bounded batches:** process a limited number of records at a time.
- **Retry policy:** retry temporary network errors with a limit and backoff; do not retry permanent validation errors forever.
- **Partial progress:** persist completed batches so one failure does not require restarting everything.
- **Observability:** record start/end, fetched/created/updated/skipped counts, and failure details without logging secrets.

Service sketch:

```js
export async function syncRemoteRecords({ provider, records, checkpoint }) {
  const cursor = await checkpoint.get();
  let nextCursor = cursor;
  const totals = { fetched: 0, upserted: 0 };

  do {
    const page = await provider.fetchPage({ cursor: nextCursor });
    totals.fetched += page.items.length;

    for (const item of page.items) {
      await records.upsertByExternalId(item.id, normalizeRecord(item));
      totals.upserted += 1;
    }

    nextCursor = page.nextCursor;
    await checkpoint.set(nextCursor);
  } while (nextCursor !== null);

  return totals;
}
```

The exact checkpoint rule depends on the provider contract: only advance a cursor after the records it represents are safely persisted. Use database transactions where appropriate and enforce uniqueness in the database, not only in application code.

---

## 4. Queue Introduction

A queue separates **when work is requested** from **when a worker performs it**:

```text
Scheduler/API → enqueue job → Redis-backed queue → worker → database/report
```

A queue is useful when jobs need persistence across process restarts, retries, concurrency limits, delayed execution, or worker processes independent from the web server. A cron callback alone is simpler when none of those requirements apply.

BullMQ is a Redis-backed queue for Node.js. Install it if using this section:

```bash
npm install bullmq
```

Minimal producer/worker shape:

```js
import { Queue, Worker } from "bullmq";

const connection = { host: "127.0.0.1", port: 6379 };
const reportQueue = new Queue("reports", { connection });

await reportQueue.add(
  "daily-report",
  { reportDate: "2026-11-01" },
  { jobId: "daily-report-2026-11-01", attempts: 3 },
);

const worker = new Worker(
  "reports",
  async (job) => {
    if (job.name === "daily-report") {
      await generateReport(job.data.reportDate);
    }
  },
  { connection },
);
```

Use the connection options and lifecycle appropriate for the deployed Redis configuration. In production, configure Redis authentication/TLS and close queues and workers during shutdown. A stable job ID can prevent duplicate enqueueing for that ID, but the job handler should still be idempotent: retries and process failures can happen.

For recurring work, decide which component owns the schedule. Multiple schedulers must not independently enqueue duplicate jobs unless the queue/job ID strategy intentionally makes that safe. Keep job payloads small; store large inputs durably and enqueue their IDs.

---

## 5. Graceful Shutdown and Testing

Stop accepting new work before closing resources:

1. Stop the cron task so it will not schedule another callback.
2. Stop or close the queue worker so active work can finish according to policy.
3. Close the queue and Redis connections.
4. Close database and HTTP resources.

Test the service logic without waiting for a real cron time: call the report/sync function directly with test repositories and a fake provider. Test the scheduler wiring separately, and test that repeated runs with the same input do not create duplicates.

For operational checks, capture at least the last successful run, duration, processed count, and failure reason. Alert on missed or repeatedly failing jobs when the data is important.

---

## Check Your Understanding

1. What happens to a `node-cron` task if its Node process is down at the scheduled time?
2. Why does `noOverlap` not prevent duplicate work across two replicas?
3. What makes a database upsert by external ID useful for safe retries?
4. When is a queue preferable to doing all the work in the scheduled callback?
5. Why should a scheduled report generator accept a report date rather than always reading the current clock?
