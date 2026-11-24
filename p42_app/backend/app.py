from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, os, math
from algorithms.matcher import Matcher

app = Flask(__name__)
CORS(app)
DB = os.path.join(os.path.dirname(__file__), 'platform.db')

def db():
    con=sqlite3.connect(DB); con.row_factory=sqlite3.Row; return con

def init_db():
    with db() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS workers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,skills TEXT,experience INTEGER,lat REAL,lon REAL,radius REAL,available INTEGER DEFAULT 1,capacity INTEGER DEFAULT 3);
        CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY AUTOINCREMENT, household TEXT, service TEXT, details TEXT, lat REAL, lon REAL, date TEXT, status TEXT DEFAULT 'Pending', selected_worker INTEGER);
        ''')
        if c.execute('SELECT COUNT(*) FROM workers').fetchone()[0]==0:
            demo=[('Aarav Sharma','Electrician,Appliance Repair',5,31.225,75.77,10),('Meera Singh','Plumber,Home Maintenance',4,31.218,75.765,8),('Kabir Kumar','Carpenter,Painting',7,31.23,75.78,12),('Simran Kaur','Cleaning,Gardening',3,31.215,75.755,8),('Dev Patel','Electrician,Plumber',6,31.24,75.79,15)]
            c.executemany('INSERT INTO workers(name,skills,experience,lat,lon,radius) VALUES(?,?,?,?,?,?)',demo)

def distance(a,b,c,d):
    r=6371; p1,p2=math.radians(a),math.radians(c); dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(math.sqrt(x))

@app.get('/api/health')
def health(): return jsonify(status='ok',service='Community Services Matching Platform')

@app.get('/api/workers')
def workers():
    with db() as c: rows=c.execute('SELECT * FROM workers ORDER BY name').fetchall()
    return jsonify([dict(x,skills=x['skills'].split(',')) for x in rows])

@app.post('/api/workers')
def add_worker():
    x=request.get_json() or {}
    required=['name','skills','experience','lat','lon','radius']
    if any(k not in x for k in required): return jsonify(error='Missing required worker fields'),400
    skills=','.join(x['skills']) if isinstance(x['skills'],list) else str(x['skills'])
    with db() as c:
        cur=c.execute('INSERT INTO workers(name,skills,experience,lat,lon,radius,available) VALUES(?,?,?,?,?,?,?)',(x['name'],skills,int(x['experience']),float(x['lat']),float(x['lon']),float(x['radius']),int(x.get('available',1))))
        wid=cur.lastrowid
    return jsonify(id=wid,message='Worker created'),201

@app.post('/api/requests')
def create_request():
    x=request.get_json() or {}
    required=['household','service','lat','lon']
    if any(k not in x for k in required): return jsonify(error='Missing required request fields'),400
    with db() as c:
        cur=c.execute('INSERT INTO requests(household,service,details,lat,lon,date) VALUES(?,?,?,?,?,?)',(x['household'],x['service'],x.get('details',''),float(x['lat']),float(x['lon']),x.get('date','today')))
        rid=cur.lastrowid
    return jsonify(id=rid,status='Pending'),201

@app.get('/api/requests')
def get_requests():
    with db() as c: rows=c.execute('SELECT * FROM requests ORDER BY id DESC').fetchall()
    return jsonify([dict(r) for r in rows])

@app.get('/api/requests/<int:rid>/matches')
def matches(rid):
    with db() as c:
        r=c.execute('SELECT * FROM requests WHERE id=?',(rid,)).fetchone()
        ws=c.execute('SELECT * FROM workers WHERE available=1',( )).fetchall()
    if not r: return jsonify(error='Request not found'),404
    eligible=[]
    for w in ws:
        skills=w['skills'].lower().split(',')
        if r['service'].lower() in [s.strip().lower() for s in skills]:
            km=distance(w['lat'],w['lon'],r['lat'],r['lon'])
            if km<=w['radius']:
                skill=min(w['experience'],10)/10
                proximity=1-km/w['radius']
                availability=1
                score=.35*skill+.40*proximity+.25*availability
                eligible.append({'id':w['id'],'name':w['name'],'skills':skills,'experience':w['experience'],'distance_km':round(km,2),'score':round(score*100,1),'available':True})
    eligible.sort(key=lambda z:z['score'],reverse=True)
    return jsonify(request_id=rid,matches=eligible[:10],count=len(eligible))

@app.post('/api/requests/<int:rid>/select')
def select_worker(rid):
    x=request.get_json() or {}; wid=x.get('worker_id')
    with db() as c:
        w=c.execute('SELECT id FROM workers WHERE id=? AND available=1',(wid,)).fetchone()
        if not w: return jsonify(error='Worker unavailable or not found'),404
        cur=c.execute("UPDATE requests SET selected_worker=?,status='Matched' WHERE id=? AND status='Pending'",(wid,rid))
        if cur.rowcount==0: return jsonify(error='Request not found or already matched'),409
    return jsonify(message='Worker selected',request_id=rid,worker_id=wid,status='Matched')

@app.get('/api/admin/stats')
def stats():
    with db() as c:
        workers=c.execute('SELECT COUNT(*) FROM workers').fetchone()[0]
        total=c.execute('SELECT COUNT(*) FROM requests').fetchone()[0]
        matched=c.execute("SELECT COUNT(*) FROM requests WHERE status='Matched'").fetchone()[0]
        pending=total-matched
        services=[dict(x) for x in c.execute('SELECT service,COUNT(*) count FROM requests GROUP BY service')]
    return jsonify(workers=workers,requests=total,matched=matched,pending=pending,services=services)

init_db()
if __name__=='__main__': app.run(debug=True,port=5000)
