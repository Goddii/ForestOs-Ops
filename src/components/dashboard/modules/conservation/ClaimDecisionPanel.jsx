import { useState } from 'react'
import { Check, FileSearch, X } from 'lucide-react'
import { Panel, PrototypeTag } from '../../DashboardKit'
import { EVIDENCE_KINDS, OFFICER_ID, POLICY, REJECT_REASONS } from '../../../../lib/conservation/policy'
import { EVIDENCE_KIND_LABEL, REJECT_REASON_LABEL } from '../../../../lib/conservation/labels'
import Callout from './Callout'
import Confirmation from './Confirmation'
import { BTN_PRIMARY, BTN_SECONDARY, BTN_WARN, CAPTION, ERROR, HINT, INPUT, LABEL, TEXTAREA, fieldProps } from './ui'

const C = POLICY.claims

/** One column of the decision panel. */
function Option({ id, icon: Icon, title, intro, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col rounded-xl border border-line bg-paper-sunk/30 p-4">
      <h4 id={id} className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Icon className="h-4 w-4 text-ink-muted" strokeWidth={2.25} aria-hidden="true" />
        {title}
      </h4>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{intro}</p>
      <div className="mt-3 flex flex-1 flex-col gap-3">{children}</div>
    </section>
  )
}

/**
 * Approve, request more evidence, or reject. The rules are in the reducer;
 * this panel shows what stops each option and surfaces the reducer's refusal
 * next to the control that was used. Decisions are final in this prototype.
 */
export default function ClaimDecisionPanel({ detail, runner }) {
  const { notice, errors, run } = runner
  const { claim, status, flags, blockers } = detail
  const [justification, setJustification] = useState('')
  const [kind, setKind] = useState(EVIDENCE_KINDS[0])
  const [evidenceNote, setEvidenceNote] = useState('')
  const [reason, setReason] = useState('')
  const [rejectNote, setRejectNote] = useState('')

  const final = status === 'verified' || status === 'rejected'
  const requestOpen = Boolean(claim.evidenceRequest)
  const cannotRequest = final || requestOpen
  const canApprove = status === 'awaiting_decision' && !blockers.some((b) => b.hard)
  const hard = blockers.filter((b) => b.hard)
  const soft = blockers.filter((b) => !b.hard)
  const flagWord = flags.length === 1 ? 'flag' : 'flags'

  const approve = () =>
    run(
      'approve',
      { type: 'DECIDE_CLAIM', payload: { claimId: claim.claimId, outcome: 'approve', by: OFFICER_ID, justification } },
      (result) =>
        result.status === 'awaiting_countersign'
          ? `${claim.claimId} approved. It now waits for a countersign.`
          : `${claim.claimId} approved and verified.`,
      () => setJustification(''),
    )
  const request = () =>
    run(
      'request',
      { type: 'REQUEST_EVIDENCE', payload: { claimId: claim.claimId, kind, note: evidenceNote } },
      (result) =>
        `More evidence requested on ${claim.claimId}${result.taskId ? `; field check ${result.taskId} created` : ''}${result.withdrewApproval ? '; the earlier approval is withdrawn' : ''}.`,
      () => setEvidenceNote(''),
    )
  const reject = () =>
    run(
      'reject',
      { type: 'DECIDE_CLAIM', payload: { claimId: claim.claimId, outcome: 'reject', by: OFFICER_ID, reason, note: rejectNote } },
      () => `${claim.claimId} rejected.`,
      () => {
        setReason('')
        setRejectNote('')
      },
    )

  return (
    <Panel
      title="Decision"
      lede="Approve, ask for more evidence, or reject. A decision to approve or reject is final in this prototype; there is no undo."
      actions={<PrototypeTag label="Proposed policy" />}
    >
      {hard.length > 0 && (
        <Callout tone="critical" role="alert" title="Blocks approval" className="mb-4">
          <ul className="list-disc space-y-0.5 pl-4">
            {hard.map((b) => (
              <li key={b.code}>{b.message.replace(/^Blocks approval: /, '')}</li>
            ))}
          </ul>
        </Callout>
      )}
      {soft.length > 0 && (
        <p className="mb-4 text-[13px] font-medium text-ink">{soft.map((b) => b.message).join(' ')}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Option
          id="decision-approve"
          icon={Check}
          title="Approve"
          intro={
            flags.length > 0
              ? `This claim has ${flags.length} ${flagWord}. Approving needs a justification of at least ${C.justificationMinChars} characters and a countersign.`
              : detail.needsCountersign
                ? `Approving sends it for a countersign, because it covers ${C.countersignAreaHa} ha or more.`
                : 'No flags and no countersign needed. Approving verifies it.'
          }
        >
          {flags.length > 0 && (
            <div>
              <label htmlFor="approve-justification" className={LABEL}>
                Justification
              </label>
              <textarea
                {...fieldProps('approve-justification', errors.approve, true)}
                rows={3}
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                disabled={!canApprove}
                className={TEXTAREA}
              />
              <p id="approve-justification-hint" className={HINT}>
                Say why the flags do not stop this claim counting. At least {C.justificationMinChars} characters.
              </p>
            </div>
          )}
          <div className="mt-auto">
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={!canApprove}
              aria-describedby={errors.approve ? 'approve-error' : undefined}
              onClick={approve}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Approve
            </button>
            {errors.approve && (
              <p id="approve-error" role="alert" className={ERROR}>
                {errors.approve}
              </p>
            )}
          </div>
        </Option>

        <Option
          id="decision-evidence"
          icon={FileSearch}
          title="Request more evidence"
          intro="Pauses the decision clock until the evidence comes back. A field check also creates a task for the Zone Manager."
        >
          <div>
            <label htmlFor="evidence-kind" className={LABEL}>
              What is needed
            </label>
            <select
              id="evidence-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              disabled={cannotRequest}
              className={INPUT}
            >
              {EVIDENCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EVIDENCE_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="evidence-note" className={LABEL}>
              Note to the field team
            </label>
            <textarea
              {...fieldProps('evidence-note', errors.request, true)}
              rows={3}
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              disabled={cannotRequest}
              className={TEXTAREA}
            />
            <p id="evidence-note-hint" className={HINT}>
              {requestOpen
                ? 'A request is already open. Mark the evidence received first.'
                : `At least ${C.evidenceRequestNoteMinChars} characters.`}
            </p>
          </div>
          <div className="mt-auto">
            <button type="button" className={BTN_SECONDARY} disabled={cannotRequest} onClick={request}>
              <FileSearch className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Request more evidence
            </button>
            {errors.request && (
              <p id="evidence-note-error" role="alert" className={ERROR}>
                {errors.request}
              </p>
            )}
          </div>
        </Option>

        <Option
          id="decision-reject"
          icon={X}
          title="Reject"
          intro="Returns the claim to the reporting centre. Choose the main reason and explain it."
        >
          <div>
            <label htmlFor="reject-reason" className={LABEL}>
              Reason
            </label>
            <select
              id="reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={final}
              className={INPUT}
            >
              <option value="">Choose a reason…</option>
              {REJECT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REJECT_REASON_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reject-note" className={LABEL}>
              Note
            </label>
            <textarea
              {...fieldProps('reject-note', errors.reject, true)}
              rows={3}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              disabled={final}
              className={TEXTAREA}
            />
            <p id="reject-note-hint" className={HINT}>
              At least {C.rejectNoteMinChars} characters.
            </p>
          </div>
          <div className="mt-auto">
            <button type="button" className={BTN_WARN} disabled={final} onClick={reject}>
              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Reject
            </button>
            {errors.reject && (
              <p id="reject-note-error" role="alert" className={ERROR}>
                {errors.reject}
              </p>
            )}
          </div>
        </Option>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className={CAPTION}>Result</p>
        <Confirmation message={notice} />
      </div>
    </Panel>
  )
}
