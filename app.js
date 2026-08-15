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

const spider = document.querySelector('#coverage-spider')
const directions = [
  ['N', .88], ['NE', .72], ['E', .58], ['SE', .66],
  ['S', .52], ['SW', .74], ['W', .82], ['NW', .96],
]
const spiderCenter = 150
const spiderRadius = 98
const spiderPoint = (value, index, scale = 1) => {
  const angle = (Math.PI * 2 * index) / directions.length - Math.PI / 2
  const distance = spiderRadius * value * scale
  return [spiderCenter + Math.cos(angle) * distance, spiderCenter + Math.sin(angle) * distance]
}

spider.innerHTML = `
  ${[.25,.5,.75,1].map(scale => `<polygon points="${directions.map((_,index)=>spiderPoint(1,index,scale).join(',')).join(' ')}" class="spider-ring" />`).join('')}
  ${directions.map((_,index)=>{const [x,y]=spiderPoint(1,index);return `<line x1="${spiderCenter}" y1="${spiderCenter}" x2="${x}" y2="${y}" class="spider-axis" />`}).join('')}
  <polygon points="${directions.map(([,value],index)=>spiderPoint(value,index).join(',')).join(' ')}" class="spider-area" />
  ${directions.map(([,value],index)=>{const [x,y]=spiderPoint(value,index);return `<circle cx="${x}" cy="${y}" r="4" class="spider-point" />`}).join('')}
  ${directions.map(([label],index)=>{const [x,y]=spiderPoint(1,index,1.22);return `<text x="${x}" y="${y+4}" text-anchor="middle" class="spider-label">${label}</text>`}).join('')}
`
