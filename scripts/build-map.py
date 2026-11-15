"""Build illustrative 34-region map from public-domain geoBoundaries polygons.
Run with shapely installed and the source GeoJSON path as first argument.
Source and attribution: ../data/SOURCES.md. No external data used at runtime.
"""
import json,sys,unicodedata,math
from shapely.geometry import shape
from shapely.ops import unary_union
GROUPS=[['Tuyên Quang','Hà Giang'],['Lào Cai','Yên Bái'],['Thái Nguyên','Bắc Kạn'],['Phú Thọ','Vĩnh Phúc','Hòa Bình'],['Bắc Ninh','Bắc Giang'],['Hưng Yên','Thái Bình'],['Hải Phòng','Hải Dương'],['Ninh Bình','Nam Định','Hà Nam'],['Quảng Trị','Quảng Bình'],['Đà Nẵng','Quảng Nam'],['Quảng Ngãi','Kon Tum'],['Gia Lai','Bình Định'],['Đắk Lắk','Phú Yên'],['Khánh Hòa','Ninh Thuận'],['Lâm Đồng','Đắk Nông','Bình Thuận'],['Đồng Nai','Bình Phước'],['TP. Hồ Chí Minh','Ho Chi Minh','Bình Dương','Bà Rịa–Vũng Tàu','Côn Đảo'],['Tây Ninh','Long An'],['Đồng Tháp','Tiền Giang'],['Vĩnh Long','Bến Tre','Trà Vinh'],['Cần Thơ','Hậu Giang','Sóc Trăng'],['An Giang','Kiên Giang'],['Cà Mau','Bạc Liêu'],['Huế','Thừa Thiên Huế'],['Hà Nội'],['Cao Bằng'],['Lạng Sơn'],['Quảng Ninh'],['Điện Biên'],['Lai Châu'],['Sơn La'],['Thanh Hóa'],['Nghệ An'],['Hà Tĩnh']]
def norm(x):return ''.join(c for c in unicodedata.normalize('NFD',x.lower().replace('đ','d')) if not unicodedata.combining(c)).strip()
source=json.load(open(sys.argv[1]));features={norm(f['properties']['shapeName']):shape(f['geometry']).buffer(0) for f in source['features']}
def xy(x,y):return ((x-101.6)*71,(24.2-y)*85)
result=[]
for names in GROUPS:
 parts=[features[norm(n)] for n in names if norm(n) in features]
 assert parts,names
 geom=unary_union(parts).simplify(.009,preserve_topology=True)
 polys=list(geom.geoms) if geom.geom_type=='MultiPolygon' else [geom]
 d=''
 for poly in polys:
  for ring in [poly.exterior,*poly.interiors]:
   points=[xy(x,y) for x,y in ring.coords]
   d+='M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in points)+'Z'
 point=geom.representative_point();x,y=xy(point.x,point.y)
 alias=names[:]
 if names[0]=='TP. Hồ Chí Minh':alias+=['Hồ Chí Minh','HCM','TPHCM','Sài Gòn','Sai Gon','Vung Tau','Bà Rịa Vũng Tàu']
 if names[0]=='Huế':alias+=['Thua Thien Hue']
 result.append({'id':norm(names[0]).replace('.','').replace(' ','-'),'name':names[0],'aliases':alias,'x':round(x,1),'y':round(y,1),'path':d})
assert len(result)==34
json.dump(result,open('data/provinces.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(result),'regions',len(set(k for n in GROUPS for k in n)))
