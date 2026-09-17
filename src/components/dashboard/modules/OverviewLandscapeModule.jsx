import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { ModuleHeader, Panel } from '../DashboardKit'
import SectorFocusView from '../sector/SectorFocusView'
import { landscapeSummary } from '../../../lib/forestLine'

/**
 * The four Forest Line actions as one connected sequence — See → Verify →
 * Value → Reward (the PRD's spine). Each stage carries live figures pulled from
 * the modules that own them and links through.
 */
function buildFlow() {
  const s = landscapeSummary()
  return [
    {
      key: 'see',
      verb: 'See',
      line: 'The physical landscape — buffer blocks, plots, and the tea grown on them.',
      figures: [
        { v: s.see.plotsMapped, k: 'plots mapped in the sector' },
        { v: `${(s.see.greenLeafKg / 1000).toFixed(1)} t`, k: `green leaf across ${s.see.harvestsLogged} recorded harvests` },
      ],
      to: '/app/zone/buffer',
      cta: 'Open the sector map',
    },
    {
      key: 'verify',
      verb: 'Verify',
      line: 'A reported claim is not a verified one. Every claim moves through field + satellite checks.',
      figures: [
        { v: `${s.verify.batchesVerified} / ${s.verify.batchesVerified + s.verify.batchesPending}`, k: 'branded batches verified vs in the pipeline' },
        { v: `+${s.verify.ndviDelta}`, k: 'NDVI recovery vs the 2020 baseline' },
      ],
      to: '/app/ops/verification',
      cta: 'Open the verification queue',
    },
    {
      key: 'value',
      verb: 'Value',
      line: 'Verified conservation and volume become visible economic value, in Kenyan Shillings, for the people who did the work.',
      figures: [
        { v: `+${s.value.conservationPremiumKesPerKg}`, k: `KES/kg conservation premium, of KES ${s.value.totalKesPerKg} total` },
        { v: `KES ${s.value.medianWeeklyPay.toLocaleString()}`, k: 'median weekly pay, South West Mau' },
      ],
      to: '/app/zone/pay',
      cta: 'Open pay & parity',
    },
    {
      key: 'reward',
      verb: 'Reward',
      line: 'Value routes back to farmers, buffer conservation, training and verification — every shilling has a destination.',
      figures: [
        { v: s.reward.farmers.toLocaleString(), k: 'farmers & workers represented' },
        { v: `${s.reward.bufferHa.toLocaleString()} ha`, k: `buffer under maintenance across ${s.reward.zones} zones` },
      ],
      to: '/app/management',
      cta: 'Open the landscape roll-up',
    },
  ]
}

function FlowStage({ stage, index }) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col rounded-xl border border-emerald-900/10 bg-card p-5 shadow-card">
      <h3 className="flex items-baseline gap-2 font-display text-2xl leading-none text-emerald-950">
        <span className="font-mono text-[13px] text-ink-faint">{index + 1}</span>
        {stage.verb}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{stage.line}</p>

      <dl className="mt-4 space-y-2.5">
        {stage.figures.map((f) => (
          <div key={f.k}>
            <dt className="font-display text-[1.6rem] leading-none tabular-nums text-ink">{f.v}</dt>
            <dd className="mt-0.5 text-[11px] leading-snug text-ink-faint">{f.k}</dd>
          </div>
        ))}
      </dl>

      <Link
        to={stage.to}
        className="group mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald-700 transition-colors hover:text-emerald-800"
      >
        {stage.cta}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
      </Link>
    </div>
  )
}

const CHAIN = ['Land', 'Block', 'Plot', 'Harvest', 'Batch', 'Processing', 'Buyer']

export default function OverviewLandscapeModule() {
  const flow = buildFlow()

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Forest Line"
        sub="One landscape · one connected record · South West Mau prototype"
      />

      <p className="max-w-[70ch] text-[15px] leading-relaxed text-ink-muted">
        Forest Line turns a physical forest buffer into something{' '}
        <span className="text-ink">provable, fundable and valuable</span> — so farmers get paid more,
        the buffer keeps growing, and a buyer can see the evidence behind every batch. Four connected
        actions:
      </p>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {flow.map((stage, i) => (
          <li key={stage.key} className="flex">
            <FlowStage stage={stage} index={i} />
          </li>
        ))}
      </ol>

      <p className="max-w-[70ch] text-[13px] leading-relaxed text-ink-faint">
        <span className="text-ink-muted">Reward reinvests in the buffer</span> — patrols, replanting,
        training, verification — which is what widens the landscape you See on the next cycle.
      </p>

      <Panel
        title="The landscape"
        lede="Select a plot to follow its connected record — the harvests logged against it, and the batches pressed from them with their verification status."
      >
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
          {CHAIN.map((node, i) => (
            <span key={node} className="flex items-center gap-2">
              <span className={node === 'Buyer' ? 'text-emerald-700' : 'text-ink-muted'}>{node}</span>
              {i < CHAIN.length - 1 && <ChevronRight className="h-3 w-3 text-line-strong" strokeWidth={2} aria-hidden="true" />}
            </span>
          ))}
        </div>
        <SectorFocusView variant="eudr" />
      </Panel>
    </div>
  )
}
