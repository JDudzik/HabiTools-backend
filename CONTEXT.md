# Habitools Habitica Integration

This context defines the shared domain language for integrating Habitica capabilities into Habitools. It exists to keep tool behavior, account-linking rules, and user-facing messages aligned as features are added.

## Language

**Habitools User**:
An authenticated user record in Habitools.
_Avoid_: App user, local user

**Linked Habitica Account**:
The single Habitica account authorized by a Habitools User for tool automation.
_Avoid_: Profile, secondary account, multiple linked accounts

**Protected Habitica Credential**:
An encrypted Habitica API key stored reversibly for authorized outbound Habitica calls.
_Avoid_: Password hash, one-way hash

**Tool Instance**:
A user-owned Habitica tool record that is the lifecycle source of truth for one automation configuration against a Linked Habitica Account.
_Avoid_: Standalone tool account, duplicated account mapping

**Validated Link Activation**:
The account-linking step that succeeds only after credential validation and initial Habitica user pull both complete.
_Avoid_: Optimistic link, degraded linked state

**Tool Lease**:
The 30-day active window for a single Tool Instance.
_Avoid_: Global account lease, shared timer across tools

**Lease Refresh**:
An action that only extends a non-expired Tool Lease by 30 days without rebuilding the Tool Instance.
_Avoid_: Reconcile-and-repair refresh, recreate-on-refresh

**Tool Reprovision**:
Creating a brand-new Tool Instance after a Tool Lease has expired.
_Avoid_: Auto-revive expired instance

**Catastrophic Drift**:
A non-expired Tool Instance state where required execution infrastructure is missing or inconsistent and safe operation cannot continue.
_Avoid_: Silent partial failure, best-effort continuation

**Fail-Closed Tool Disablement**:
Deactivating and fully removing a broken Tool Instance after Catastrophic Drift, then requiring explicit reprovisioning.
_Avoid_: Partial disable, limping mode

**Substantial Event Message**:
An event message that represents account/tool health risk or lifecycle change and should notify the user.
_Avoid_: Routine success logs

**Tool-Local Event Message**:
An event message scoped to normal tool behavior that does not trigger user notification.
_Avoid_: Global notification event

**Habitica Inbound Webhook**:
An unauthenticated POST from Habitica routed by URL-based obscurity only; no signature or secret is provided by Habitica.
_Avoid_: Signed webhook, verified webhook

**Stateless Quest Handler**:
A webhook or cron handler that treats every invocation as potentially the first, and always consults Habitica for current party/quest state before acting.
_Avoid_: State-dependent handler, replay-protected handler

## Relationships

- A **Habitools User** has exactly one **Linked Habitica Account** in v1
- A **Linked Habitica Account** belongs to exactly one **Habitools User**
- A **Linked Habitica Account** stores one **Protected Habitica Credential**
- A **Linked Habitica Account** can own many **Tool Instances**
- A **Tool Instance** references exactly one **Linked Habitica Account**
- A **Linked Habitica Account** can have at most one active **Tool Instance** per tool type
- A **Tool Instance** ID is the `resource_id` anchor for its webhook, cron, and event-message records
- A **Tool Instance** can have many cron, webhook, and event-message records over time
- Cron, webhook, and event-message records may also exist without any resource link
- A **Linked Habitica Account** is considered active only after **Validated Link Activation**
- Each **Tool Instance** has its own **Tool Lease**
- Each **Tool Instance** has one **Tool Lifecycle Status**
- **Lease Refresh** applies only to non-expired **Tool Leases**
- **Tool Lease** expiration alone does not represent all lifecycle outcomes
- Expired **Tool Leases** require **Tool Reprovision**
- **Catastrophic Drift** triggers **Fail-Closed Tool Disablement** even if the lease is still active
- **Substantial Event Message** uses should_notify=true
- **Tool-Local Event Message** uses should_notify=false
- **Habitica Inbound Webhook** is trusted by URL obscurity only
- A **Stateless Quest Handler** always fetches live Habitica state before acting
- No delivery deduplication is applied; Habitica is assumed to deliver each event once
