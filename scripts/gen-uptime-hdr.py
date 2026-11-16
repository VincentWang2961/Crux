# HDR glow sprites for the uptime lights (public/uptime/hdr-<colour>.avif).
# Writes 64x64 16-bit RGBA PNGs whose values are already PQ-encoded in BT.2020: a bright disc
# (peak = BOOST x SDR reference white, hotter towards the centre) with a soft halo. Encode with
# avifenc, telling it the pixels are PQ / BT.2020 (cicp 9/16/9), e.g. from a scratch folder:
#
#   python3 scripts/gen-uptime-hdr.py 3
#   for c in green orange red; do
#     avifenc --cicp 9/16/9 -r full -d 10 -y 444 -q 90 --qalpha 90 --ignore-icc $c.png public/uptime/hdr-$c.avif
#   done
#
# Serve the files as they are: next/image would re-encode them and drop the HDR metadata.
import zlib, struct, math, sys
S=64; R_DISC=8.0; R_HALO=30.0
SDR_WHITE=203.0  # nits (BT.2408 reference white)
def lin(c): c/=255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
M=[[0.6274,0.3293,0.0433],[0.0691,0.9195,0.0114],[0.0164,0.0880,0.8956]]  # BT.709 -> BT.2020 (linear)
def pq(n):
    m1,m2,c1,c2,c3=0.1593017578125,78.84375,0.8359375,18.8515625,18.6875
    y=max(n,0)/10000; yp=y**m1; return ((c1+c2*yp)/(1+c3*yp))**m2
def png(path,rgba):
    raw=b''.join(b'\0'+b''.join(struct.pack('>4H',*px) for px in row) for row in rgba)
    ch=lambda t,d: struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',S,S,16,6,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b''))
COLORS={'green':(0x22,0xc5,0x5e),'orange':(0xf9,0x73,0x16),'red':(0xef,0x44,0x44)}
BOOST=float(sys.argv[1]) if len(sys.argv)>1 else 4.0   # disc peak = BOOST x SDR white
for name,(r,g,b) in COLORS.items():
    l=[lin(r),lin(g),lin(b)]
    l2=[sum(M[i][j]*l[j] for j in range(3)) for i in range(3)]
    rows=[]
    for y in range(S):
        row=[]
        for x in range(S):
            d=math.hypot(x+0.5-S/2,y+0.5-S/2)
            disc=min(max(R_DISC+0.5-d,0),1)           # antialiased disc
            halo=math.exp(-((max(d-R_DISC,0))/7.5)**2)*0.55*(d<R_HALO)
            a=max(disc,halo)
            # disc: full HDR boost (white-hot core toward centre); halo: dimmer
            k=BOOST*(1+0.6*max(0,1-d/R_DISC)) if disc>0 else BOOST*0.6
            c=[pq(v*SDR_WHITE*k) for v in l2]
            row.append(tuple(int(round(v*65535)) for v in c)+(int(round(a*65535)),))
        rows.append(row)
    png(f'{name}.png',rows)
print('ok')
