"""Weighted utility matcher + nearest-available baseline.

Utility model (all terms in [0,1], weights sum to 1):
  U(w,r) = Ws*S + Wd*D + Wa*A
  S = 0.5 + 0.5*min(exp_years_in_skill,10)/10      (skill compatibility)
  D = 1 - haversine_km / worker_service_radius_km   (proximity)
  A = 1 - jobs_that_day / daily_capacity            (remaining capacity)
Hard filters (worker is NOT eligible, never assigned): lacks skill,
slot not available, daily capacity full, request outside service radius.
"""
import numpy as np

EARTH_R_KM = 6371.0088
WEIGHTS = {"skill": 0.35, "distance": 0.40, "availability": 0.25}

def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * EARTH_R_KM * np.arcsin(np.sqrt(a))

class Matcher:
    def __init__(self, workers, weights=None):
        """workers: list of dicts {lat, lon, radius_km, capacity, skills:{skill:exp}, slots:set[int]}"""
        self.w = weights or WEIGHTS
        assert abs(sum(self.w.values()) - 1) < 1e-9, "weights must sum to 1"
        n = len(workers)
        self.lat = np.array([x["lat"] for x in workers]); self.lon = np.array([x["lon"] for x in workers])
        self.radius = np.array([x["radius_km"] for x in workers], float)
        self.cap = np.array([x["capacity"] for x in workers], float)
        self.slots = np.zeros((n, 21), bool)
        for i, x in enumerate(workers):
            self.slots[i, list(x["slots"])] = True
        skills = {s for x in workers for s in x["skills"]}
        self.exp = {s: np.array([x["skills"].get(s, np.nan) for x in workers]) for s in skills}
        self.load = {}  # date -> jobs per worker

    def _eligible(self, req):
        exp = self.exp.get(req["service"], np.full(len(self.lat), np.nan))
        load = self.load.setdefault(req["date"], np.zeros(len(self.lat)))
        d = haversine_km(self.lat, self.lon, req["lat"], req["lon"])
        ok = ~np.isnan(exp) & self.slots[:, req["slot"]] & (load < self.cap) & (d <= self.radius)
        return ok, d, exp, load

    def rank(self, req, k=3):
        """Proposed algorithm: eligible workers ranked by utility. Returns [(idx, score, km)]."""
        ok, d, exp, load = self._eligible(req)
        idx = np.flatnonzero(ok)
        if idx.size == 0:
            return []  # no suitable worker
        S = 0.5 + 0.5 * np.minimum(exp[idx], 10) / 10
        D = 1 - d[idx] / self.radius[idx]
        A = 1 - load[idx] / self.cap[idx]
        U = self.w["skill"] * S + self.w["distance"] * D + self.w["availability"] * A
        order = np.lexsort((d[idx], -U))[:k]
        return [(int(idx[i]), float(U[i]), float(d[idx][i])) for i in order]

    def nearest(self, req, k=3):
        """Baseline: same hard filters, ranked purely by distance."""
        ok, d, _, _ = self._eligible(req)
        idx = np.flatnonzero(ok)
        order = np.argsort(d[idx])[:k]
        return [(int(idx[i]), None, float(d[idx][i])) for i in order]

    def assign(self, req, idx):
        self.load[req["date"]][idx] += 1
