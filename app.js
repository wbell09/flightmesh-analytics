const API = '/api'
const $ = (selector) => document.querySelector(selector)
const number = new Intl.NumberFormat()
let customer = null
let stations = []
let selectedStationId = null
let refreshTimer = null

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.detail || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return payload
}

function show(element, visible = true) { element.classList.toggle('hidden', !visible) }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]) }
function stationStatusLabel(status) { return ({ online:'Online', stale:'Reconnecting', offline:'Offline', never_seen:'Not connected' })[status] || 'Checking' }

function showLogin(message = '') {
  clearInterval(refreshTimer)
  show($('#session-check'), false)
  show($('#dashboard'), false)
  show($('#login-panel'))
  $('#login-error').textContent = message
  show($('#login-error'), Boolean(message))
}

async function loadSession() {
  try {
    customer = await request('/account')
    show($('#session-check'), false)
    show($('#login-panel'), false)
    show($('#dashboard'))
    await loadStations()
    refreshTimer = window.setInterval(loadStations, 30000)
  } catch (error) {
    showLogin(error.status === 401 ? '' : error.message)
  }
}

async function loadStations() {
  try {
    const payload = await request('/account/stations')
    customer = payload.customer
    stations = payload.stations || []
    $('#welcome-copy').textContent = `${customer.display_name} · Private station data refreshed from FlightMeshAir.`
    renderStationSelect()
    renderStationTable()
    show($('#empty-state'), stations.length === 0)
    show($('#analytics-content'), stations.length > 0)
    if (!stations.length) return
    const stored = localStorage.getItem('flightmesh-analytics-station')
    if (!selectedStationId || !stations.some(s => s.station_id === selectedStationId)) {
      selectedStationId = stations.some(s => s.station_id === stored) ? stored : stations[0].station_id
      $('#station-select').value = selectedStationId
    }
    await loadAnalytics()
  } catch (error) {
    if (error.status === 401) return showLogin('Your session expired. Please sign in again.')
    showError(error.message)
  }
}

function renderStationSelect() {
  $('#station-select').innerHTML = stations.map(station => `<option value="${escapeHtml(station.station_id)}">${escapeHtml(station.display_name)} (${escapeHtml(station.station_id)})</option>`).join('')
  if (selectedStationId) $('#station-select').value = selectedStationId
}

function renderStationTable() {
  $('#station-table').innerHTML = `<div class="station-row table-head" role="row"><span>Station</span><span>Aircraft</span><span>Heartbeat</span><span>Status</span></div>` + stations.map(station => {
    const age = station.seconds_since_last_seen == null ? 'Never' : station.seconds_since_last_seen < 60 ? `${Math.round(station.seconds_since_last_seen)}s ago` : `${Math.round(station.seconds_since_last_seen / 60)}m ago`
    const warning = station.status !== 'online'
    return `<button class="station-row station-row-button${station.station_id === selectedStationId ? ' selected' : ''}" data-station="${escapeHtml(station.station_id)}" role="row"><span><i class="dot ${warning ? 'warning' : 'online'}"></i>${escapeHtml(station.display_name)}<small>${escapeHtml(station.station_id)}</small></span><b>${station.aircraft_count ?? '—'}</b><b>${age}</b><em class="${warning ? 'warning-text' : ''}">${stationStatusLabel(station.status)}</em></button>`
  }).join('')
  document.querySelectorAll('[data-station]').forEach(button => button.addEventListener('click', () => selectStation(button.dataset.station)))
}

async function selectStation(stationId) {
  selectedStationId = stationId
  localStorage.setItem('flightmesh-analytics-station', stationId)
  $('#station-select').value = stationId
  renderStationTable()
  await loadAnalytics()
}

async function loadAnalytics() {
  const station = stations.find(item => item.station_id === selectedStationId)
  if (!station) return
  showError('')
  $('#refresh-button').disabled = true
  $('#refresh-button').textContent = 'Updating…'
  try {
    const id = encodeURIComponent(selectedStationId)
    const [history24, history168, coverage] = await Promise.all([
      request(`/account/stations/${id}/history?hours=24`),
      request(`/account/stations/${id}/history?hours=168`),
      request(`/account/stations/${id}/coverage?hours=24`),
    ])
    renderSummary(station, history24.buckets || [], coverage)
    renderActivity(history24.buckets || [])
    renderHealth(station)
    renderCoverage(coverage)
    renderWeekly(history168.buckets || [])
    $('#updated-at').textContent = `Updated ${new Date().toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}`
  } catch (error) {
    if (error.status === 401) return showLogin('Your session expired. Please sign in again.')
    showError(error.message)
  } finally {
    $('#refresh-button').disabled = false
    $('#refresh-button').textContent = 'Refresh'
  }
}

function renderSummary(station, buckets, coverage) {
  const latest = buckets.at(-1)
  const observations = buckets.reduce((sum, item) => sum + Number(item.observation_count || 0), 0)
  $('#aircraft-total').textContent = number.format(latest?.unique_aircraft || 0)
  $('#aircraft-note').textContent = latest ? 'Unique aircraft in latest hourly bucket' : 'Collecting the first hourly bucket'
  $('#message-total').textContent = compact(observations)
  $('#station-health').textContent = stationStatusLabel(station.status)
  $('#heartbeat-note').textContent = station.seconds_since_last_seen == null ? 'No heartbeat received' : `Last heartbeat ${Math.round(station.seconds_since_last_seen)} seconds ago`
  $('#coverage-aircraft').textContent = coverage.available ? number.format(coverage.aircraft_count || 0) : '—'
  $('#coverage-note').textContent = coverage.available ? 'Unique aircraft with range data' : coverage.reason
}

function renderActivity(buckets) {
  const chart = $('#activity-chart')
  const width = 760, height = 250, padding = 12
  if (!buckets.length) { chart.innerHTML = '<text x="380" y="125" text-anchor="middle" class="empty-chart">Collecting hourly observations…</text>'; $('#chart-axis').innerHTML = ''; return }
  const values = buckets.map(item => Number(item.unique_aircraft || 0))
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => [padding + index / Math.max(values.length - 1, 1) * (width - padding * 2), height - padding - value / max * (height - padding * 2)])
  const path = points.map(([x,y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${path} L ${points.at(-1)[0]} ${height-padding} L ${points[0][0]} ${height-padding} Z`
  chart.innerHTML = `<defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c3ff" stop-opacity=".34"/><stop offset="1" stop-color="#22c3ff" stop-opacity="0"/></linearGradient></defs>${[0,1,2,3,4].map(i=>`<line x1="${padding}" y1="${padding+i*55}" x2="${width-padding}" y2="${padding+i*55}" stroke="rgba(92,195,226,.10)"/>`).join('')}<path d="${area}" fill="url(#area-fill)"/><path d="${path}" fill="none" stroke="#22c3ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map(([x,y],i)=>i%4===0||i===points.length-1?`<circle cx="${x}" cy="${y}" r="4" fill="#061b2d" stroke="#78e0c5" stroke-width="2"/>`:'').join('')}`
  const labels = buckets.filter((_, i) => i % Math.max(1, Math.floor(buckets.length / 6)) === 0 || i === buckets.length - 1)
  $('#chart-axis').innerHTML = labels.map(item => `<span>${new Date(item.bucket_start).toLocaleTimeString([], { hour:'numeric' })}</span>`).join('')
}

function renderHealth(station) {
  const scores = { online:100, stale:55, offline:0, never_seen:0 }
  const score = scores[station.status] ?? 0
  $('#health-gauge').style.setProperty('--score', score)
  $('#health-score').textContent = `${score}%`
  $('#status-pill span').textContent = stationStatusLabel(station.status)
  $('#status-pill').classList.toggle('warning-status', station.status !== 'online')
  $('#health-station').textContent = station.station_id
  $('#health-aircraft').textContent = station.aircraft_count ?? '—'
  $('#health-version').textContent = station.client_version || '—'
}

function renderCoverage(coverage) {
  const unavailable = !coverage.available
  show($('#coverage-unavailable'), unavailable)
  $('#coverage-unavailable').textContent = unavailable ? `${coverage.reason}. Add an approximate station location to enable range analytics.` : ''
  const directions = coverage.available ? coverage.directions : ['N','NE','E','SE','S','SW','W','NW'].map(label => ({ label, aircraft:0 }))
  const max = Math.max(...directions.map(item => Number(item.aircraft || 0)), 1)
  const normalized = directions.map(item => [item.label, Number(item.aircraft || 0) / max])
  renderSpider(normalized)
  const strongest = coverage.available ? [...directions].sort((a,b) => b.aircraft-a.aircraft)[0] : null
  const farthest = coverage.available ? [...coverage.distance_bands].reverse().find(band => band.aircraft > 0) : null
  $('#strongest-sector').textContent = strongest?.aircraft ? strongest.label : '—'
  $('#farthest-band').textContent = farthest?.label || '—'
  $('#analyzed-aircraft').textContent = coverage.available ? number.format(coverage.aircraft_count || 0) : '—'
}

function renderSpider(directions) {
  const center=150, radius=98
  const point=(value,index,scale=1)=>{const angle=Math.PI*2*index/directions.length-Math.PI/2;const distance=radius*value*scale;return[center+Math.cos(angle)*distance,center+Math.sin(angle)*distance]}
  $('#coverage-spider').innerHTML = `${[.25,.5,.75,1].map(scale=>`<polygon points="${directions.map((_,i)=>point(1,i,scale).join(',')).join(' ')}" class="spider-ring"/>`).join('')}${directions.map((_,i)=>{const[x,y]=point(1,i);return`<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="spider-axis"/>`}).join('')}<polygon points="${directions.map(([,v],i)=>point(v,i).join(',')).join(' ')}" class="spider-area"/>${directions.map(([,v],i)=>{const[x,y]=point(v,i);return`<circle cx="${x}" cy="${y}" r="4" class="spider-point"/>`}).join('')}${directions.map(([label],i)=>{const[x,y]=point(1,i,1.22);return`<text x="${x}" y="${y+4}" text-anchor="middle" class="spider-label">${label}</text>`}).join('')}`
}

function renderWeekly(buckets) {
  const days = new Map()
  buckets.forEach(item => { const date = new Date(item.bucket_start); const key = date.toLocaleDateString('en-CA'); const current = days.get(key) || { label:date.toLocaleDateString([], { weekday:'short' }), value:0 }; current.value += Number(item.observation_count || 0); days.set(key,current) })
  const values = [...days.values()].slice(-7)
  const max = Math.max(...values.map(item => item.value), 1)
  $('#weekly-bars').innerHTML = values.length ? values.map((item,index)=>`<div class="${index===values.length-1?'today':''}" style="--h:${Math.max(4,item.value/max*100)}%" title="${number.format(item.value)} observations"><span>${item.label}</span></div>`).join('') : '<p class="trend-empty">Collecting seven-day history…</p>'
}

function compact(value) { return value >= 1e6 ? `${(value/1e6).toFixed(2)}M` : value >= 1e3 ? `${(value/1e3).toFixed(1)}K` : number.format(value) }
function showError(message) { $('#dashboard-error').textContent = message; show($('#dashboard-error'), Boolean(message)) }

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault()
  const button = event.currentTarget.querySelector('button')
  button.disabled = true; button.textContent = 'Signing in…'
  try {
    await request('/auth/login', { method:'POST', body:JSON.stringify({ email:$('#email').value, password:$('#password').value }) })
    $('#password').value = ''
    await loadSession()
  } catch (error) { showLogin(error.message) }
  finally { button.disabled = false; button.textContent = 'Sign in' }
})
$('#logout-button').addEventListener('click', async () => { try { await request('/auth/logout', { method:'POST' }) } finally { customer=null;stations=[];selectedStationId=null;showLogin() } })
$('#refresh-button').addEventListener('click', loadStations)
$('#station-select').addEventListener('change', event => selectStation(event.target.value))

loadSession()
