/**
 * Hands a generated CSV to the browser as a file. The text already carries its
 * byte-order mark and CRLF line ends (see `lib/conservation/exports.js`); this
 * only wraps it in a Blob and clicks a temporary link.
 */
export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
