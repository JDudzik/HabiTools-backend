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
A user-owned automation configuration that executes one Habitools tool against a Linked Habitica Account.
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
- A **Tool Instance** references exactly one **Linked Habitica Account**
- A **Linked Habitica Account** is considered active only after **Validated Link Activation**
- Each **Tool Instance** has its own **Tool Lease**
- **Lease Refresh** applies only to non-expired **Tool Leases**
- Expired **Tool Leases** require **Tool Reprovision**
- **Catastrophic Drift** triggers **Fail-Closed Tool Disablement** even if the lease is still active
- **Substantial Event Message** uses should_notify=true
- **Tool-Local Event Message** uses should_notify=false
- **Habitica Inbound Webhook** is trusted by URL obscurity only
- A **Stateless Quest Handler** always fetches live Habitica state before acting
- No delivery deduplication is applied; Habitica is assumed to deliver each event once

## Example dialogue

> **Dev:** "Can one **Habitools User** run automation across two Habitica accounts?"
> **Domain expert:** "No. In v1, each **Habitools User** has one **Linked Habitica Account** only."

## Flagged ambiguities

- "linked account" was left open to many-per-user; resolved: exactly one **Linked Habitica Account** per **Habitools User** in v1.
- "encrypt like password hashing" was ambiguous; resolved: use reversible encryption with per-record salt-derived keying, not one-way hashing.
- tool ownership was ambiguous; resolved: the **Linked Habitica Account** is source of truth and all **Tool Instances** reference it.
- initial-link failure behavior was ambiguous; resolved: linking fails closed unless credential validation and initial user pull both succeed, and the API response informs the user of failure.
- expiration scope was ambiguous; resolved: the 30-day timer is per **Tool Instance** via an independent **Tool Lease**.
- refresh semantics were ambiguous; resolved: **Lease Refresh** only extends time for a non-expired instance, while expired instances must be replaced via **Tool Reprovision**.
- drift handling was ambiguous; resolved: catastrophic infra mismatch (for example, cron missing while webhook remains) triggers a high-priority user message and **Fail-Closed Tool Disablement**.
- event-message scope was ambiguous; resolved: lifecycle/health failures notify the user, while routine Auto Accept Quest executions remain tool-local.
- webhook trust model was ambiguous; resolved: trust is URL-obscurity only (Habitica provides no signature), no idempotency key, handlers are **Stateless Quest Handlers** that always re-query Habitica, and unverifiable origin rejects and emits a **Substantial Event Message** only after repeated failures.
- hourly cron scope was ambiguous; resolved: the cron is purely a redundant state-correcting check that fetches live party/quest state and accepts any pending invitation — no lease validation, no webhook re-registration.
- quest acceptance filtering was ambiguous; resolved: accept all pending quest invitations unconditionally in v1.
- webhook type scope was ambiguous; resolved: register only the `questActivity` Habitica webhook type with the `questInvited` event enabled.
- webhook expiration behavior was ambiguous; resolved: on Tool Lease expiry or Fail-Closed Tool Disablement, the Habitica webhook is deleted from Habitica's servers entirely, not merely disabled.
- webhook callback URL construction was ambiguous; resolved: use `BACKEND_HOST` env var as the base (e.g. `${BACKEND_HOST}/v1/webhooks/trigger/${url_id}`).
- credential encryption key material was ambiguous; resolved: use a dedicated `HABITICA_ENCRYPTION_SECRET` env var as the master key; derive a per-record key via HMAC from master + per-record salt; encrypt with AES-256-GCM storing salt + IV + ciphertext in `encrypted_api_key`.
- Habitica webhook ID storage was ambiguous; resolved: store the Habitica-assigned webhook ID in `data.habiticaWebhookId` on the corresponding internal `webhooks` row.
