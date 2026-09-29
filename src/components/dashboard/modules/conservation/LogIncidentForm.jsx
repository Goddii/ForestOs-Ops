import { useState } from 'react'
import { INCIDENT_TYPES } from '../../../../lib/conservation/policy'
import { INCIDENT_TYPE_LABEL } from '../../../../lib/conservation/labels'
import Callout from './Callout'
import { BTN_PRIMARY, BTN_SECONDARY, ERROR, HINT, INPUT, LABEL, TEXTAREA } from './ui'

/**
 * A compact form for an incident phoned in: type, segment, an optional
 * position and a note. It records one report from the officer. The runner and
 * the confirmation line belong to the list, so they survive the form closing.
 */
export default function LogIncidentForm({ segments, zoneName, runner, onClose }) {
  const { errors, run } = runner
  const [type, setType] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [note, setNote] = useState('')

  const submit = (event) => {
    event.preventDefault()
    run(
      'log',
      { type: 'LOG_INCIDENT', payload: { type, segmentId, lat: lat.trim(), lon: lon.trim(), note } },
      (result) => `${result.id} logged with one report from the officer.`,
      () => {
        setType('')
        setSegmentId('')
        setLat('')
        setLon('')
        setNote('')
        onClose()
      },
    )
  }

  return (
    <form onSubmit={submit} className="mb-5 grid gap-4 rounded-xl border border-line bg-paper-sunk/30 p-4 sm:grid-cols-2" aria-label="Log an incident">
      <div>
        <label htmlFor="log-type" className={LABEL}>
          Type
        </label>
        <select id="log-type" value={type} onChange={(event) => setType(event.target.value)} className={INPUT}>
          <option value="">Choose a type…</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {INCIDENT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="log-segment" className={LABEL}>
          Boundary segment
        </label>
        <select id="log-segment" value={segmentId} onChange={(event) => setSegmentId(event.target.value)} className={INPUT}>
          <option value="">Choose a segment…</option>
          {segments.map((s) => (
            <option key={s.segmentId} value={s.segmentId}>
              {s.name} · {zoneName(s.zoneId)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="log-lat" className={LABEL}>
          Latitude (optional)
        </label>
        <input id="log-lat" type="text" inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} autoComplete="off" aria-describedby="log-gps-hint" className={INPUT} />
      </div>
      <div>
        <label htmlFor="log-lon" className={LABEL}>
          Longitude (optional)
        </label>
        <input id="log-lon" type="text" inputMode="decimal" value={lon} onChange={(event) => setLon(event.target.value)} autoComplete="off" aria-describedby="log-gps-hint" className={INPUT} />
        <p id="log-gps-hint" className={HINT}>
          Decimal degrees, for example −0.3956 and 35.5900. Without a position the message to KFS leaves out its GPS line.
        </p>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="log-note" className={LABEL}>
          Note (optional)
        </label>
        <textarea id="log-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} aria-describedby="log-note-hint" className={TEXTAREA} />
        <Callout tone="warn" className="mt-2 p-3!">
          <span id="log-note-hint">Do not enter names or phone numbers. Reports carry a channel, never an identity.</span>
        </Callout>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" className={BTN_PRIMARY}>
          Log incident
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onClose}>
          Cancel
        </button>
        {errors.log && (
          <p role="alert" className={ERROR + ' basis-full'}>
            {errors.log}
          </p>
        )}
      </div>
    </form>
  )
}
