import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, ClipboardList, MapPin,
  Search, Activity, Plus, ArrowUpRight, CheckCircle2,
  Clock3, Wrench, Bell, Menu, X, RefreshCw
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";

import {
  MapContainer, TileLayer, Marker, Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
const workerIcon = L.divIcon({
  className: "",
  html: `<div style="
    background:#16a34a;
    width:16px;
    height:16px;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 1px 5px #555;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const unavailableIcon = L.divIcon({
  className: "",
  html: `<div style="
    background:#dc2626;
    width:16px;
    height:16px;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 1px 5px #555;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const householdIcon = L.divIcon({
  className: "",
  html: `<div style="
    background:#2563eb;
    width:16px;
    height:16px;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 1px 5px #555;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const API = "https://commonground-fu7m.onrender.com/api";

const markerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const navigation = [
  ["Overview", LayoutDashboard],
  ["Service Requests", ClipboardList],
  ["Find Workers", Search],
  ["Worker Dashboard", Users],
  ["Workers", Users],
  ["Map View", MapPin],
  ["Analytics", Activity],
];

export default function App() {
 const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning 👋";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon 👋";
  } else {
    return "Good evening 👋";
  }
};
    const [showWorkers, setShowWorkers] = useState(true);
const [showHouseholds, setShowHouseholds] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState({});
  const [workers, setWorkers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [workerId, setWorkerId] = useState("1");
const [invitations, setInvitations] = useState([]);
const [history, setHistory] = useState([]);

  const [form, setForm] = useState({
    household: "Demo Household",
    service: "Electrician",
    details: "",
    lat: "31.22",
    lon: "75.77",
  });
async function loadData() {
  try {
    setLoading(true);

    const [s, w, r] = await Promise.all([
      fetch(`${API}/admin/stats`).then(res => res.json()),
      fetch(`${API}/workers`).then(res => res.json()),
      fetch(`${API}/requests`).then(res => res.json()),
    ]);

    setStats(s);
    setWorkers(w);
    setRequests(r);
    setMessage("");

  } catch (error) {
    console.error("Backend error:", error);
    setMessage("Backend error: " + error.message);

  } finally {
    setLoading(false);
  }
}
async function loadInvitations() {
  try {
    const response = await fetch(
      `${API}/workers/${workerId}/invitations`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Could not load invitations.");
      return;
    }

    setInvitations(data || []);
    setMessage("");
  } catch (error) {
    console.error("Invitation loading error:", error);
    setMessage("Unable to load worker invitations.");
  }
}
async function respondToInvitation(requestId, action) {
  try {
    const response = await fetch(
      `${API}/workers/${workerId}/invitations/${requestId}/respond`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Could not submit response.");
      return;
    }

    setMessage(
      action === "accept"
        ? "Invitation accepted successfully!"
        : "Invitation rejected."
    );

    await loadData();
    await loadInvitations();
    await loadWorkerHistory();

  } catch (error) {
    console.error("Worker response error:", error);
    setMessage("Unable to submit your response.");
  }
}
async function loadWorkerHistory() {
  try {
    const response = await fetch(
      `${API}/workers/${workerId}/history`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Could not load response history.");
      return;
    }

    setHistory(data || []);
  } catch (error) {
    console.error("History loading error:", error);
    setMessage("Unable to load response history.");
  }
}
useEffect(() => {
  loadData();
}, []);

useEffect(() => {
  if (tab === "Worker Dashboard") {
    loadInvitations();
    loadWorkerHistory();
  }
}, [tab, workerId]);
  
    async function findWorkers(id) {
  try {
    const response = await fetch(`${API}/requests/${id}/matches`);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Could not load worker matches.");
      return;
    }

    setSelected(id);
    setMatches(data.matches || []);
    setMessage("");
    setTab("Find Workers");

  } catch (error) {
    console.error("Find workers error:", error);
    setMessage("Could not load worker matches.");
  }
}
  async function createRequest(e) {
  e.preventDefault();

  try {
    const response = await fetch(`${API}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lat: Number(form.lat),
        lon: Number(form.lon),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Request creation failed.");
      return;
    }

    setMessage("Service request created successfully!");

    await loadData();
    await findWorkers(data.id);

  } catch (error) {
    console.error("Create request error:", error);
    setMessage("Unable to connect to the backend.");
  }
}
async function selectWorker(workerId) {
  try {
    const response = await fetch(
      `${API}/requests/${selected}/select`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerId }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Worker selection failed.");
      return;
    }

    setMessage("");
    await loadData();

  } catch (error) {
    console.error("Selection error:", error);
    setMessage("Worker selection failed.");
  }
}
  

  const filteredWorkers = workers.filter(worker =>
    `${worker.name} ${worker.skills.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const serviceData = (stats.services || []).map(item => ({
    name: item.service,
    requests: item.count,
  }));

  const matchData = [
  { name: "Matched", value: stats.matched || 0 },
  { name: "Pending", value: stats.pending || 0 },
  { name: "Awaiting Response", value: stats.awaiting || 0 },
  { name: "Rejected", value: stats.rejected || 0 },
];

  const COLORS = [
  "#50bea2", // Matched - Teal
  "#e9a65a", // Pending - Orange
  "#5489c4", // Awaiting Response - Blue
  "#d66b6b", // Rejected - Red
];
  const selectedRequest = requests.find(
  r => String(r.id) === String(selected)
);

const selectedWorker = workers.find(
  w => String(w.id) === String(selectedRequest?.selected_worker)
);
console.log("Selected Request:", selectedRequest);
console.log("Selected Worker:", selectedWorker);

  return (
    <div className="shell">

      {/* SIDEBAR */}

      <aside className="side">

        <div className="brand">
          <div className="logo">C</div>
          <div>
            <b>CommonGround</b>
            <small>COMMUNITY SERVICES</small>
          </div>
        </div>

        <div className="workspace">WORKSPACE</div>

        {navigation.map(([name, Icon]) => (
          <button
            key={name}
            className={`nav ${tab === name ? "active" : ""}`}
            onClick={() => setTab(name)}
          >
            <Icon size={19} />
            {name}
          </button>
        ))}

        <div className="sidebottom">
          <div className="avatar">CG</div>
          <div>
            <b>Project Demo</b>
            <small>Administrator</small>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main">

        <header>
          <div>
            <span className="eyebrow">
              COMMUNITY NETWORK / {tab.toUpperCase()}
            </span>

            <h1>
  {tab === "Overview" ? getGreeting() : tab}
</h1>
          </div>

          <div className="headright">
            <button className="iconbtn" onClick={loadData}>
              <RefreshCw size={17} />
            </button>

            <span className="live">
              <i /> System operational
            </span>

            <div className="avatar">CG</div>
          </div>
        </header>

        {message && (
          <div className="notice" onClick={() => setMessage("")}>
            {message}　×
          </div>
        )}

        <AnimatePresence mode="wait">

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >

            {/* OVERVIEW */}

            {tab === "Overview" && (
              <>

                <section className="hero">

                  <div>
                    <span className="pill">
                      ✦ LOCAL SERVICES, BETTER CONNECTED
                    </span>

                    <h2>
                      Bring your community
                      <br />
                      closer, <em>one match at a time.</em>
                    </h2>

                    <p>
                      Connect households with trusted local
                      service providers through intelligent,
                      location-aware matching.
                    </p>

                    <button
                      className="primary"
                      onClick={() => setTab("Service Requests")}
                    >
                      Create a service request
                      <ArrowUpRight size={17} />
                    </button>
                  </div>

                  <div className="heroart">
                    <div className="orbit o1" />
                    <div className="orbit o2" />

                    <div className="centerpin">
                      <MapPin size={32} />
                    </div>

                    <div className="float f1">✓ Skilled workers</div>
                    <div className="float f2">⌖ Nearby matches</div>
                    <div className="float f3">✦ Community first</div>
                  </div>

                </section>

                <div className="sectiontitle">
                  <div>
                    <h3>Platform overview</h3>
                    <p>Your community at a glance</p>
                  </div>

                  <span className="date">LIVE DATABASE</span>
                </div>

                <div className="stats">

                  <Stat
                    icon={Users}
                    label="Registered workers"
                    value={stats.workers ?? "—"}
                    color="mint"
                  />

                  <Stat
                    icon={ClipboardList}
                    label="Service requests"
                    value={stats.requests ?? "—"}
                    color="blue"
                  />

                  <Stat
                    icon={CheckCircle2}
                    label="Successful matches"
                    value={stats.matched ?? "—"}
                    color="purple"
                  />

                  <Stat
                    icon={Clock3}
                    label="Awaiting match"
                    value={stats.pending ?? "—"}
                    color="orange"
                  />

                </div>

                <div className="grid2">

                  <div className="panel">

                    <div className="panelhead">
                      <div>
                        <h3>Recent service requests</h3>
                        <p>Latest household requirements</p>
                      </div>

                      <button
                        className="textbtn"
                        onClick={() => setTab("Service Requests")}
                      >
                        View all →
                      </button>
                    </div>

                    {requests.slice(0, 5).map(r => (
                      <div className="row" key={r.id}>

                        <div className="serviceicon">
                          <Wrench size={17} />
                        </div>

                        <div className="rowmain">
                          <b>{r.service}</b>
                          <small>
                            {r.household} · Request #{r.id}
                          </small>
                        </div>

                        <span className={
                          `status ${r.status === "Matched" ? "done" : "pending"}`
                        }>
                          {r.status}
                        </span>

                        <button
                          className="iconbtn"
                          onClick={() => findWorkers(r.id)}
                        >
                          ↗
                        </button>

                      </div>
                    ))}

                    {!requests.length && (
                      <div className="empty">
                        No requests yet. Create your first request.
                      </div>
                    )}

                  </div>

                  <div className="panel accentpanel">
                    <span className="eyebrow">GET STARTED</span>

                    <h3>
                      Make your first
                      <br />
                      community match.
                    </h3>

                    <p>
                      Post a household requirement and discover
                      skilled workers in your area.
                    </p>

                    <button
                      className="primary"
                      onClick={() => setTab("Service Requests")}
                    >
                      Create request <Plus size={16} />
                    </button>
                  </div>

                </div>

              </>
            )}

            {/* SERVICE REQUESTS */}

            {tab === "Service Requests" && (

              <div className="grid2 requestgrid">

                <div className="panel">

                  <h3>Create service request</h3>
                  <p>Tell us what help your household needs.</p>

                  <form onSubmit={createRequest}>

                    <label>
                      Household name

                      <input
                        value={form.household}
                        onChange={e =>
                          setForm({ ...form, household: e.target.value })
                        }
                        required
                      />
                    </label>

                    <label>
                      Service category

                      <select
                        value={form.service}
                        onChange={e =>
                          setForm({ ...form, service: e.target.value })
                        }
                      >
                        {[
                          "Electrician", "Plumber", "Carpenter",
                          "Cleaning", "Painting", "Gardening",
                          "Appliance Repair", "Home Maintenance"
                        ].map(item => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Describe the requirement

                      <textarea
                        value={form.details}
                        onChange={e =>
                          setForm({ ...form, details: e.target.value })
                        }
                        placeholder="Describe the work required..."
                      />
                    </label>

                    <div className="two">

                      <label>
                        Latitude
                        <input
                          value={form.lat}
                          onChange={e =>
                            setForm({ ...form, lat: e.target.value })
                          }
                        />
                      </label>

                      <label>
                        Longitude
                        <input
                          value={form.lon}
                          onChange={e =>
                            setForm({ ...form, lon: e.target.value })
                          }
                        />
                      </label>

                    </div>

                    <button className="primary full">
                      Submit request <ArrowUpRight size={16} />
                    </button>

                  </form>

                </div>

                <div className="panel">

                  <h3>All requests</h3>
                  <p>Find suitable workers for each request.</p>

                  {requests.map(r => (
                    <div className="requestrow" key={r.id}>

                      <div>
                        <b>#{r.id} · {r.service}</b>
                        <small>{r.household}</small>

<span className={`status ${
  r.status === "Matched" ? "matched" :
  r.status === "Rejected" ? "rejected" :
  r.status === "Awaiting Response" ? "awaiting" :
  "pending"
}`}>
  {r.status}
</span>
                      </div>

                      <button
                        className="outline"
                        onClick={() => findWorkers(r.id)}
                      >
                        Find workers
                      </button>

                    </div>
                  ))}

                  {!requests.length && (
                    <div className="empty">No requests available.</div>
                  )}

                </div>

              </div>

            )}

            {/* FIND WORKERS */}

            {tab === "Find Workers" && (
              <>

              <div className="panel">

                <div className="panelhead">
                  <div>
                    <h3>Recommended workers</h3>
                    <p>
                      {selected
                        ? `Ranked matches for request #${selected}`
                        : "Select a request to see suitable workers"}
                    </p>
                  </div>

                  <span className="pill">WEIGHTED MATCHING</span>
                </div>

                {matches.length ? matches.map(w => (

                  <div className="workerrow" key={w.id}>

                    <div className="workeravatar">
                      {w.name.split(" ").map(x => x[0]).join("")}
                    </div>

                    <div className="rowmain">
                      <b>{w.name}</b>
                      <small>
                        {w.skills.join(" · ")}
                        {" · "}
                        {w.experience} years experience
                      </small>
                    </div>

                    <div className="distance">
                      <b>{w.distance_km} km</b>
                      <small>away</small>
                    </div>

                    <div className="score">
                      <b>{w.score}%</b>
                      <small>match score</small>
                    </div>

                    <button
  className={`smallbtn ${
    String(selectedRequest?.selected_worker) === String(w.id)
      ? "selectedbtn"
      : "primary"
  }`}
  onClick={() => selectWorker(w.id)}
  disabled={
  !!selectedRequest?.selected_worker &&
  selectedRequest?.status !== "Rejected"
}
>
  {String(selectedRequest?.selected_worker) === String(w.id)
    ? "✓ Selected"
    : selectedRequest?.selected_worker &&
  selectedRequest?.status !== "Rejected"
    ? "Invitation Sent"
    : "Select Worker"}
</button>

                  </div>

                )) : (

                  <div className="empty">
                    No matches yet. Create a request or select one
                    from Service Requests.
                  </div>

                )}

              </div>
              {selectedWorker &&
 selectedRequest &&
 selectedRequest.status === "Matched" && (
  <div className="panel" style={{ marginTop: "20px" }}>

    <div className="panelhead">
      <div>
        <h3>Selected Worker Location</h3>
        <p>
          Showing {selectedWorker.name} and the household location.
        </p>
      </div>

      <span className="pill">WORKER SELECTED</span>
    </div>

    <MapContainer
      center={[
        Number(selectedWorker.lat),
        Number(selectedWorker.lon)
      ]}
      zoom={13}
      scrollWheelZoom={true}
      style={{
        height: "350px",
        width: "100%",
        borderRadius: "12px"
      }}
    >

      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker
  position={[
    Number(selectedWorker.lat),
    Number(selectedWorker.lon)
  ]}
  icon={workerIcon}
>
  <Popup>
    <b>{selectedWorker.name}</b>
    <p>Selected Worker</p>
  </Popup>
</Marker>

      <Marker
  position={[
    Number(selectedRequest.lat),
    Number(selectedRequest.lon)
  ]}
  icon={householdIcon}
>
  <Popup>
    <b>{selectedRequest.household}</b>
    <p>{selectedRequest.service}</p>
    <p>Household Location</p>
  </Popup>
</Marker>

    </MapContainer>

    <div className="mapnote">
      Worker and household locations are synthetic demonstration coordinates.
    </div>

  </div>
)}
</>
            )}
{/* WORKER DASHBOARD */}

{tab === "Worker Dashboard" && (
  <div className="panel">

    <div className="panelhead">
      <div>
        <h3>Worker Dashboard</h3>
        <p>Manage incoming service invitations.</p>
      </div>

      <span className="pill">WORKER PORTAL</span>
    </div>

    <label>
      Select worker

      <select
        value={workerId}
        onChange={e => setWorkerId(e.target.value)}
      >
        {workers.map(w => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </label>

    <div style={{ marginTop: "24px" }}>
      <div className="sectiontitle">
        <div>
          <h3>Incoming Invitations</h3>
          <p>Requests waiting for your response.</p>
        </div>

        <span className="status pending">
          {invitations.length} Pending
        </span>
      </div>

      {invitations.length > 0 ? (
        invitations.map(invitation => (
          <div
            className="requestrow"
            key={invitation.id}
            style={{ padding: "18px 0" }}
          >
            <div>
              <b>{invitation.service}</b>

              <small>
                Request #{invitation.id}
              </small>

              <small>
                Household: {invitation.household}
              </small>

              <small>
                Details: {invitation.details || "No additional details"}
              </small>

              <small>
                Date: {invitation.date}
              </small>
            </div>

            <div style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap"
            }}>
              <button
                className="primary"
                onClick={() =>
                  respondToInvitation(invitation.id, "accept")
                }
              >
                ✓ Accept
              </button>

              <button
                className="outline"
                onClick={() =>
                  respondToInvitation(invitation.id, "reject")
                }
              >
                ✕ Reject
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="empty">
          No pending invitations for this worker.
        </div>
      )}
    </div>

    <button
      className="outline"
      style={{ marginTop: "18px" }}
      onClick={loadInvitations}
    >
      <RefreshCw size={15} /> Refresh Invitations
    </button>
    {/* RESPONSE HISTORY */}
    <div style={{ marginTop: "32px" }}>
      <div className="sectiontitle">
        <div>
          <h3>Response History</h3>
          <p>Previously accepted and rejected invitations.</p>
        </div>

        <span className="pill">
          {history.length} Records
        </span>
      </div>

      {history.length > 0 ? (
        history.map(item => (
          <div
            className="requestrow"
            key={item.id}
            style={{ padding: "18px 0" }}
          >
            <div>
              <b>{item.service}</b>

              <small>Request #{item.request_id}</small>

              <small>Household: {item.household}</small>

              <small>
                Responded: {item.responded_at || "Not available"}
              </small>
            </div>

            <span className={`status ${
              item.status === "Matched" ? "matched" : "rejected"
            }`}>
              {item.status === "Matched" ? "Accepted" : "Rejected"}
            </span>
          </div>
        ))
      ) : (
        <div className="empty">
          No completed invitations yet.
        </div>
      )}
    </div>
  </div>

)}
            {/* WORKERS */}

            {tab === "Workers" && (

              <div className="panel">

                <div className="panelhead">
                  <div>
                    <h3>Community service providers</h3>
                    <p>Explore registered workers in the database.</p>
                  </div>
                </div>

                <div className="searchbox">
                  <Search size={17} />

                  <input
                    placeholder="Search workers or skills..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {filteredWorkers.map(w => (

                  <div className="workerrow" key={w.id}>

                    <div className="workeravatar">
                      {w.name.split(" ").map(x => x[0]).join("")}
                    </div>

                    <div className="rowmain">
                      <b>{w.name}</b>
                      <small>
                        {w.skills.join(" · ")}
                        {" · "}
                        {w.experience} years experience
                      </small>
                    </div>

                    <span className={
                      `status ${w.available ? "done" : "pending"}`
                    }>
                      {w.available ? "Available" : "Unavailable"}
                    </span>

                  </div>

                ))}

                {!filteredWorkers.length && (
                  <div className="empty">No workers found.</div>
                )}

              </div>

            )}

            {/* MAP VIEW */}

            {/* INTERACTIVE COMMUNITY MAP */}

{tab === "Map View" && (
  <div className="panel">

    <div className="panelhead">
      <div>
        <h3>Community Network Map</h3>
        <p>Explore households and nearby service providers.</p>
      </div>
      <span className="pill">LIVE DATABASE</span>
    </div>
<div className="map-filters">
  <button
    className={showWorkers ? "filter-btn active" : "filter-btn"}
    onClick={() => setShowWorkers(!showWorkers)}
  >
    🟢 Workers
  </button>

  <button
    className={showHouseholds ? "filter-btn active" : "filter-btn"}
    onClick={() => setShowHouseholds(!showHouseholds)}
  >
    🔵 Households
  </button>

  <button
    className="filter-btn"
    onClick={() => {
      setShowWorkers(true);
      setShowHouseholds(true);
    }}
  >
    Show All
  </button>
</div>
    <div className="map-legend">
      <span>🟢 Available workers</span>
      <span>🔴 Unavailable workers</span>
      <span>🔵 Households</span>
    </div>

    <div className="mapcontainer">

      <MapContainer
        center={[31.22, 75.77]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "500px", width: "100%" }}
      >

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* WORKER MARKERS */}

        {/* Worker Markers */}

  {showWorkers && workers.map((w) => (
  <Marker
    key={`worker-${w.id}`}
    position={[w.lat, w.lon]}
    icon={w.available ? workerIcon : unavailableIcon}
  >
    <Popup>
      <h3>{w.name}</h3>
      <p>Skills: {w.skills.join(", ")}</p>
      <p>Experience: {w.experience} years</p>
      <p>Status: {w.available ? "Available" : "Unavailable"}</p>
      <p>Service radius: {w.radius} km</p>
    </Popup>
  </Marker>
))}

{/* Household Markers */}
{showHouseholds && requests.map((r) => (
  <Marker
    key={`request-${r.id}`}
    position={[r.lat, r.lon]}
    icon={householdIcon}
  >
    <Popup>
      <h3>{r.household}</h3>
      <p>Service: {r.service}</p>
      <p>Request ID: #{r.id}</p>
      <p>Status: {r.status}</p>
    </Popup>
  </Marker>
))}

      </MapContainer>

    </div>

    <div className="mapnote">
      Locations are synthetic demonstration coordinates.
      They do not represent verified worker addresses.
    </div>

  </div>
)}

            {/* ANALYTICS */}

            {tab === "Analytics" && (

              <>

                <div className="stats">

                  <Stat
                    icon={Users}
                    label="Workers"
                    value={stats.workers ?? 0}
                    color="mint"
                  />

                  <Stat
                    icon={ClipboardList}
                    label="Requests"
                    value={stats.requests ?? 0}
                    color="blue"
                  />

                  <Stat
                    icon={CheckCircle2}
                    label="Matched"
                    value={stats.matched ?? 0}
                    color="purple"
                  />

                  <Stat
                    icon={Clock3}
                    label="Pending"
                    value={stats.pending ?? 0}
                    color="orange"
                  />

                </div>

                <div className="grid2 analyticsgrid">

                  <div className="panel">
                    <h3>Service demand</h3>
                    <p>Requests grouped by service category.</p>

                    <div className="chart">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={serviceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar
                            dataKey="requests"
                            fill="#50bea2"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                  </div>

                  <div className="panel">
                    <h3>Request status</h3>
                    <p>Distribution of matched and pending requests.</p>

                    <div className="chart">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={matchData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            label
                          >
                            {matchData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={COLORS[index]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                  </div>

                </div>

              </>

            )}

          </motion.div>

        </AnimatePresence>

        <footer>
          CommonGround · Community Services Matching Platform
          <span>Prototype demonstration · Synthetic worker profiles</span>
        </footer>

      </main>

    </div>
  );
}

function Stat({ icon: Icon, label, value, color = "mint" }) {

  return (
    <motion.div
      className="stat"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >

      <div className={`staticon ${color}`}>
        <Icon size={19} />
      </div>

      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>

      <ArrowUpRight className="trend" size={16} />

    </motion.div>
  );
}