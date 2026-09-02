export type SyncStage =
  | "IDENTITY"
  | "AUTHORIZATION"
  | "POLICY"
  | "ENGINE"
  | "PAYMENT"
  | "LEDGER"
  | "EVENT"
  | "WORKFLOW"
  | "OBSERVABILITY";

export interface SyncRequest {
  requestId: string;
  actorId: string;
  businessId: string;
  action: string;
  engineId: string;
  amountMinor?: bigint;
  currency?: string;
}

export interface SyncResult {
  ok: boolean;
  reference?: string;
  detail?: string;
}

export interface SyncPort {
  stage: SyncStage;
  execute(request: SyncRequest): Promise<SyncResult>;
}

export interface SyncReceipt {
  requestId: string;
  state: "COMPLETED" | "BLOCKED" | "FAILED";
  completedStages: readonly SyncStage[];
  failedStage?: SyncStage;
  references: Readonly<Record<string, string>>;
}

const REQUIRED_FLOW: readonly SyncStage[] = [
  "IDENTITY",
  "AUTHORIZATION",
  "POLICY",
  "ENGINE",
  "PAYMENT",
  "LEDGER",
  "EVENT",
  "WORKFLOW",
  "OBSERVABILITY",
];

export function requiredSyncStages(request: SyncRequest): readonly SyncStage[] {
  const money = request.amountMinor !== undefined && request.amountMinor > 0n;
  return money ? REQUIRED_FLOW : REQUIRED_FLOW.filter(stage => stage !== "PAYMENT" && stage !== "LEDGER");
}

export async function runSynchronizedAction(
  request: SyncRequest,
  ports: ReadonlyMap<SyncStage, SyncPort>
): Promise<SyncReceipt> {
  const completed: SyncStage[] = [];
  const references: Record<string, string> = {};

  for (const stage of requiredSyncStages(request)) {
    const port = ports.get(stage);
    if (!port) {
      return { requestId: request.requestId, state: "FAILED", completedStages: completed, failedStage: stage, references };
    }
    const result = await port.execute(request);
    if (!result.ok) {
      return {
        requestId: request.requestId,
        state: stage === "POLICY" || stage === "AUTHORIZATION" ? "BLOCKED" : "FAILED",
        completedStages: completed,
        failedStage: stage,
        references,
      };
    }
    completed.push(stage);
    if (result.reference) references[stage] = result.reference;
  }

  return { requestId: request.requestId, state: "COMPLETED", completedStages: completed, references };
}
