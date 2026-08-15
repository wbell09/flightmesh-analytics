const activity = [18,16,14,13,12,15,22,34,48,59,67,72,68,74,81,86,79,92,98,94,88,76,64,58]
const chart = document.querySelector('#activity-chart')

const width = 760
const height = 250
const padding = 12
const max = 110
const points = activity.map((value, index) => {
  const x = padding + (index / (activity.length - 1)) * (width - padding * 2)
  const y = height - padding - (value / max) * (height - padding * 2)
  return [x, y]
})

const path = points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
const area = `${path} L ${points.at(-1)[0]} ${height - padding} L ${points[0][0]} ${height - padding} Z`

chart.innerHTML = `
  <defs>
    <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#22c3ff" stop-opacity=".34" />
      <stop offset="1" stop-color="#22c3ff" stop-opacity="0" />
    </linearGradient>
  </defs>
  ${[0,1,2,3,4].map(i => `<line x1="${padding}" y1="${padding + i * 55}" x2="${width-padding}" y2="${padding + i * 55}" stroke="rgba(92,195,226,.10)" />`).join('')}
  <path d="${area}" fill="url(#area-fill)" />
  <path d="${path}" fill="none" stroke="#22c3ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  ${points.filter((_,i) => i % 4 === 0 || i === points.length - 1).map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#061b2d" stroke="#78e0c5" stroke-width="2" />`).join('')}
`
